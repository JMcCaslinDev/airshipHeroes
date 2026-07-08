/**
 * Ship–ship collision from block world AABBs + impulse response.
 * ponytail: AABB hull + impulse — upgrade path: SAT / per-block contact manifold.
 */

import {
  RAM_COOLDOWN_SECONDS,
  RAM_DAMAGE_PER_SPEED,
  RAM_MIN_SPEED,
  RAM_WEIGHT_DAMAGE,
  RAM_ARMOR_DAMAGE_FACTOR
} from '../combat/shipCombatConfig.js';
import { damageShipBlock, recalculateShipHealth, updateSinkingState } from '../combat/shipCombat.js';
import { creditShipDamage } from '../combat/damageAttribution.js';
import { computeShipPerformanceFromShip } from './shipPerformance.js';

const HALF = 0.5;

function shipPairKey(shipA, shipB) {
  const idA = shipA.owner?.username ?? shipA.name ?? 'a';
  const idB = shipB.owner?.username ?? shipB.name ?? 'b';
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

function syncGroupPosition(ship) {
  if (ship.group) {
    ship.group.position.set(ship.position.x, ship.position.y, ship.position.z);
  }
}

/** World-space AABB for one block (XZ used for hull collision). */
export function getBlockWorldAabb(ship, block) {
  const wp = ship.getBlockWorldPosition
    ? ship.getBlockWorldPosition(block)
    : {
      x: ship.position.x + (block.position?.x ?? 0),
      y: ship.position.y + (block.position?.y ?? 0),
      z: ship.position.z + (block.position?.z ?? 0)
    };
  return {
    minX: wp.x - HALF,
    maxX: wp.x + HALF,
    minY: wp.y - HALF,
    maxY: wp.y + HALF,
    minZ: wp.z - HALF,
    maxZ: wp.z + HALF,
    block
  };
}

export function aabbsOverlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX
    && a.minY < b.maxY && a.maxY > b.minY
    && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/** Ship hull AABB from all connected blocks. */
export function getShipWorldAabb(ship) {
  const blocks = ship?.blockManager?.blocks;
  if (!blocks?.length) {
    const { x, y, z } = ship.position;
    return {
      minX: x - 1, maxX: x + 1,
      minY: y - 1, maxY: y + 1,
      minZ: z - 1, maxZ: z + 1
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const block of blocks) {
    const box = getBlockWorldAabb(ship, block);
    minX = Math.min(minX, box.minX);
    maxX = Math.max(maxX, box.maxX);
    minY = Math.min(minY, box.minY);
    maxY = Math.max(maxY, box.maxY);
    minZ = Math.min(minZ, box.minZ);
    maxZ = Math.max(maxZ, box.maxZ);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

function overlapDepthXZ(a, b) {
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  return { overlapX, overlapZ };
}

/**
 * Find overlapping block pairs (capped) for contact + damage targeting.
 */
export function findOverlappingBlocks(shipA, shipB, maxPairs = 8) {
  const boxesA = (shipA.blockManager?.blocks ?? []).map((b) => getBlockWorldAabb(shipA, b));
  const boxesB = (shipB.blockManager?.blocks ?? []).map((b) => getBlockWorldAabb(shipB, b));
  const pairs = [];

  for (const a of boxesA) {
    for (const b of boxesB) {
      if (!aabbsOverlap(a, b)) {
        continue;
      }
      pairs.push({ blockA: a.block, blockB: b.block, boxA: a, boxB: b });
      if (pairs.length >= maxPairs) {
        return pairs;
      }
    }
  }
  return pairs;
}

export function relativeClosingSpeed(shipA, shipB, nx, nz) {
  const relVx = shipA.velocity.x - shipB.velocity.x;
  const relVz = shipA.velocity.z - shipB.velocity.z;
  return Math.max(0, relVx * nx + relVz * nz);
}

function shipMass(ship) {
  // Prefer performance weight (armor weighs more); fall back to block count
  const perf = ship.performance ?? computeShipPerformanceFromShip(ship);
  return Math.max(1, (perf.weight ?? 0) + (ship.blockManager?.blocks?.length ?? 1) * 0.15);
}

/**
 * Ram damage from closing speed + attacker weight; armor takes half.
 */
export function computeRamBlockDamage(impact, attackerWeight, blockType) {
  const weightFactor = 1 + Math.max(0, attackerWeight) * RAM_WEIGHT_DAMAGE;
  let damage = impact * RAM_DAMAGE_PER_SPEED * weightFactor;
  if (blockType === 'armor') {
    damage *= RAM_ARMOR_DAMAGE_FACTOR;
  }
  return Math.max(1, damage);
}

export function getShipRamWeight(ship) {
  const perf = ship.performance ?? computeShipPerformanceFromShip(ship);
  return perf.weight ?? 0;
}

/**
 * Resolve penetration + apply impulse so ships bounce as independent bodies.
 * @returns {{ collided: boolean, nx: number, nz: number, closing: number, pairs: Array }}
 */
export function resolveShipHullCollision(shipA, shipB) {
  const aabbA = getShipWorldAabb(shipA);
  const aabbB = getShipWorldAabb(shipB);

  if (!aabbsOverlap(aabbA, aabbB)) {
    return { collided: false, nx: 0, nz: 0, closing: 0, pairs: [] };
  }

  const pairs = findOverlappingBlocks(shipA, shipB);
  if (!pairs.length) {
    // Hull AABBs overlap but no block faces touch (gaps / Y miss) — no shove
    return { collided: false, nx: 0, nz: 0, closing: 0, pairs: [] };
  }

  const { overlapX, overlapZ } = overlapDepthXZ(aabbA, aabbB);
  const cxA = (aabbA.minX + aabbA.maxX) * 0.5;
  const czA = (aabbA.minZ + aabbA.maxZ) * 0.5;
  const cxB = (aabbB.minX + aabbB.maxX) * 0.5;
  const czB = (aabbB.minZ + aabbB.maxZ) * 0.5;

  let nx;
  let nz;
  let depth;
  if (overlapX < overlapZ) {
    nx = cxB >= cxA ? 1 : -1;
    nz = 0;
    depth = overlapX;
  } else {
    nx = 0;
    nz = czB >= czA ? 1 : -1;
    depth = overlapZ;
  }

  const massA = shipMass(shipA);
  const massB = shipMass(shipB);
  const invA = 1 / massA;
  const invB = 1 / massB;
  const invSum = invA + invB;

  // Positional correction — split by inverse mass (heavier ship moves less)
  const correction = Math.max(depth - 0.02, 0) * 0.85;
  shipA.position.x -= nx * correction * (invA / invSum);
  shipA.position.z -= nz * correction * (invA / invSum);
  shipB.position.x += nx * correction * (invB / invSum);
  shipB.position.z += nz * correction * (invB / invSum);
  syncGroupPosition(shipA);
  syncGroupPosition(shipB);

  const closing = relativeClosingSpeed(shipA, shipB, nx, nz);
  if (closing > 0.05) {
    // Soften bounce at high closing so heavy rams crush instead of ping-pong
    const restitution = Math.max(0.04, 0.2 - closing * 0.025);
    const j = -(1 + restitution) * closing / invSum;
    shipA.velocity.x += nx * j * invA;
    shipA.velocity.z += nz * j * invA;
    shipB.velocity.x -= nx * j * invB;
    shipB.velocity.z -= nz * j * invB;
  }

  return { collided: true, nx, nz, closing, pairs };
}

function ramCooldownReady(shipA, shipB, now) {
  const key = shipPairKey(shipA, shipB);
  shipA._ramPairCooldown = shipA._ramPairCooldown ?? {};
  shipB._ramPairCooldown = shipB._ramPairCooldown ?? {};
  const lastA = shipA._ramPairCooldown[key];
  const lastB = shipB._ramPairCooldown[key];
  if (lastA === undefined && lastB === undefined) {
    return true;
  }
  return now - Math.max(lastA ?? 0, lastB ?? 0) >= RAM_COOLDOWN_SECONDS * 1000;
}

function markRamCooldown(shipA, shipB, now) {
  const key = shipPairKey(shipA, shipB);
  shipA._ramPairCooldown = shipA._ramPairCooldown ?? {};
  shipB._ramPairCooldown = shipB._ramPairCooldown ?? {};
  shipA._ramPairCooldown[key] = now;
  shipB._ramPairCooldown[key] = now;
}

function damageContactBlocks(ship, contactBlocks, impact, attackerWeight, attacker) {
  const unique = [...new Set(contactBlocks)].filter((b) => b && b.type !== 'control');
  const lifts = unique.filter((b) => b.type === 'lift');
  const others = unique.filter((b) => b.type !== 'lift');
  const ordered = [...lifts, ...others];
  // Heavier / faster impacts hit more contact blocks
  const count = Math.max(
    1,
    Math.min(ordered.length, Math.floor(impact * (1 + attackerWeight * 0.15) / 1.6) + 1)
  );

  for (let i = 0; i < count; i++) {
    const block = ordered[i];
    const amount = computeRamBlockDamage(impact, attackerWeight, block.type);
    damageShipBlock(ship, block, amount, null, attacker);
  }
  recalculateShipHealth(ship);
  updateSinkingState(ship);
}

/**
 * Apply ram damage from overlapping block contacts at speed.
 * Each ship deals damage scaled by its own weight (heavier hull hits harder).
 */
export function applyRamDamage(shipA, shipB, contact, now = performance.now()) {
  if (!contact?.collided || !contact.pairs?.length) {
    return false;
  }

  const speedA = Math.hypot(shipA.velocity.x, shipA.velocity.z);
  const speedB = Math.hypot(shipB.velocity.x, shipB.velocity.z);
  const impact = Math.max(
    contact.closing,
    Math.max(speedA, speedB) * 0.55
  );

  if (impact < RAM_MIN_SPEED) {
    return false;
  }
  if (!ramCooldownReady(shipA, shipB, now)) {
    return false;
  }

  markRamCooldown(shipA, shipB, now);

  const weightA = getShipRamWeight(shipA);
  const weightB = getShipRamWeight(shipB);
  const blocksA = contact.pairs.map((p) => p.blockA);
  const blocksB = contact.pairs.map((p) => p.blockB);

  creditShipDamage(shipA, shipB.owner ?? null);
  creditShipDamage(shipB, shipA.owner ?? null);
  // B is hit by A's mass; A is hit by B's mass
  damageContactBlocks(shipB, blocksB, impact, weightA, shipA.owner ?? null);
  damageContactBlocks(shipA, blocksA, impact, weightB, shipB.owner ?? null);
  return true;
}

/** @deprecated — kept for tests that still call the old name */
export function separateShipPair(shipA, shipB) {
  return resolveShipHullCollision(shipA, shipB).collided;
}

/** @deprecated */
export function resolveShipRam(shipA, shipB, now = performance.now()) {
  const contact = resolveShipHullCollision(shipA, shipB);
  return applyRamDamage(shipA, shipB, contact, now);
}

export function getShipHullRadius(ship) {
  const aabb = getShipWorldAabb(ship);
  const hx = (aabb.maxX - aabb.minX) * 0.5;
  const hz = (aabb.maxZ - aabb.minZ) * 0.5;
  return Math.hypot(hx, hz);
}

export function getShipTouchDistance(shipA, shipB) {
  if (shipA && shipB) {
    return getShipHullRadius(shipA) + getShipHullRadius(shipB);
  }
  return 4;
}

export function updateArenaShipCollisions(players) {
  const ships = [...players]
    .map((p) => p.ship)
    .filter((s) => s && !s.isDestroyed);

  const now = performance.now();

  for (let i = 0; i < ships.length; i++) {
    for (let j = i + 1; j < ships.length; j++) {
      const contact = resolveShipHullCollision(ships[i], ships[j]);
      applyRamDamage(ships[i], ships[j], contact, now);
    }
  }
}
