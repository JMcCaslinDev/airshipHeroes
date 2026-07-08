import {
  FIRE_BURN_DAMAGE,
  FIRE_SPREAD_CHANCE,
  FIRE_SPREAD_INTERVAL,
  FIRE_TICK,
  FLAMMABLE_TYPES
} from './shipCombatConfig.js';
import { damageShipBlock, recalculateShipHealth } from './shipCombat.js';

const NEIGHBORS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
];

export function isFlammableBlock(block) {
  return block && (block.isFlammable || FLAMMABLE_TYPES.has(block.type));
}

export function setBlockOnFire(block) {
  if (!isFlammableBlock(block) || block.isBurning) {
    return false;
  }
  block.isBurning = true;
  block.burnTimer = 0;
  block.spreadTimer = FIRE_SPREAD_INTERVAL * (0.5 + Math.random());
  if (block.mesh?.material?.color) {
    block.mesh.material.color.set(0xff6622);
  }
  return true;
}

function findBlockAt(ship, pos) {
  return ship.blockManager?.blocks?.find(
    (b) => b.position.x === pos.x && b.position.y === pos.y && b.position.z === pos.z
  );
}

function trySpreadFire(ship, block) {
  for (const [dx, dy, dz] of NEIGHBORS) {
    if (Math.random() > FIRE_SPREAD_CHANCE) {
      continue;
    }
    const neighbor = findBlockAt(ship, {
      x: block.position.x + dx,
      y: block.position.y + dy,
      z: block.position.z + dz
    });
    if (neighbor) {
      setBlockOnFire(neighbor);
    }
  }
}

export function updateShipFires(ship, deltaTime, onBlockBroken) {
  const blocks = ship.blockManager?.blocks;
  if (!blocks?.length) {
    return;
  }

  for (const block of [...blocks]) {
    if (!block.isBurning) {
      continue;
    }

    block.burnTimer = (block.burnTimer ?? 0) + deltaTime;
    block.spreadTimer = (block.spreadTimer ?? FIRE_SPREAD_INTERVAL) - deltaTime;

    if (block.burnTimer >= FIRE_TICK) {
      block.burnTimer = 0;
      const destroyed = damageShipBlock(ship, block, FIRE_BURN_DAMAGE, onBlockBroken);
      if (!destroyed && block.isBurning) {
        block.burnTimer = 0;
      }
    }

    if (block.isBurning && block.spreadTimer <= 0) {
      block.spreadTimer = FIRE_SPREAD_INTERVAL;
      trySpreadFire(ship, block);
    }
  }

  recalculateShipHealth(ship);
}
