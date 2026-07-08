import { DISPENSER_COOLDOWN, DISPENSER_RANGE, REDSTONE_RANGE } from './shipCombatConfig.js';
import { setBlockOnFire } from './fireSystem.js';

const ADJ = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
];

function blockKey(pos) {
  return `${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)}`;
}

function isPowerSource(block) {
  return block?.type === 'control' || block?.type === 'steeringWheel';
}

function findBlock(ship, pos) {
  const x = Math.round(pos.x);
  const y = Math.round(pos.y);
  const z = Math.round(pos.z);
  return ship.blockManager?.blocks?.find(
    (b) => Math.round(b.position.x) === x
      && Math.round(b.position.y) === y
      && Math.round(b.position.z) === z
  );
}

/** Flood-fill signal through redstone from control / steering wheel. */
export function computePoweredTiles(ship) {
  const powered = new Set();
  const blocks = ship.blockManager?.blocks ?? [];
  const queue = [];

  for (const block of blocks) {
    if (!isPowerSource(block)) {
      continue;
    }
    const key = blockKey(block.position);
    powered.add(key);
    queue.push({ pos: { ...block.position }, dist: 0 });
  }

  while (queue.length) {
    const { pos, dist } = queue.shift();
    if (dist >= REDSTONE_RANGE) {
      continue;
    }
    for (const [dx, dy, dz] of ADJ) {
      const next = { x: pos.x + dx, y: pos.y + dy, z: pos.z + dz };
      const key = blockKey(next);
      if (powered.has(key)) {
        continue;
      }
      const block = findBlock(ship, next);
      if (block?.type === 'redstone') {
        powered.add(key);
        queue.push({ pos: next, dist: dist + 1 });
      }
    }
  }

  return powered;
}

export function isDispenserPowered(dispenser, powered) {
  for (const [dx, dy, dz] of ADJ) {
    const key = blockKey({
      x: dispenser.position.x + dx,
      y: dispenser.position.y + dy,
      z: dispenser.position.z + dz
    });
    if (powered.has(key)) {
      return true;
    }
  }
  return false;
}

function nearestEnemyFlammable(attackerShip, worldPos, targets) {
  let best = null;
  let bestScore = -Infinity;
  const heading = attackerShip.rotation ?? 0;
  const fwdX = Math.sin(heading);
  const fwdZ = Math.cos(heading);

  for (const target of targets) {
    const ship = target?.ship ?? target;
    if (!ship?.blockManager || ship === attackerShip) {
      continue;
    }
    for (const block of ship.blockManager.blocks ?? []) {
      if (block.type !== 'lift' && block.type !== 'wood') {
        continue;
      }
      const wp = ship.getBlockWorldPosition(block);
      const dx = wp.x - worldPos.x;
      const dy = wp.y - worldPos.y;
      const dz = wp.z - worldPos.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > DISPENSER_RANGE) {
        continue;
      }
      const align = dist > 0.001
        ? (dx / dist) * fwdX + (dz / dist) * fwdZ
        : 1;
      const score = align * 2 + (DISPENSER_RANGE - dist) / DISPENSER_RANGE;
      if (score > bestScore) {
        bestScore = score;
        best = { block, victimShip: ship };
      }
    }
  }

  return best;
}

function findShipOwningBlock(targets, block) {
  for (const target of targets) {
    const ship = target?.ship ?? target;
    if (ship?.blockManager?.blocks?.includes(block)) {
      return ship;
    }
  }
  return null;
}

function fireDispenserCharge(dispenser, ship, targets) {
  const worldPos = ship.getBlockWorldPosition(dispenser);
  const hit = nearestEnemyFlammable(ship, worldPos, targets);
  if (!hit) {
    return false;
  }

  setBlockOnFire(hit.block);
  const victimShip = hit.victimShip ?? findShipOwningBlock(targets, hit.block);
  if (victimShip && ship.owner) {
    victimShip.lastDamagedBy = ship.owner;
  }
  return true;
}

function setRedstonePoweredVisual(ship, powered, active) {
  for (const block of ship.blockManager?.blocks ?? []) {
    if (block.type !== 'redstone' || !block.mesh?.material) {
      continue;
    }
    const lit = active && powered.has(blockKey(block.position));
    block.mesh.material.emissive?.setHex?.(lit ? 0x661100 : 0x000000);
    block.mesh.material.emissiveIntensity = lit ? 0.55 : 0;
  }
}

/** Fire dispensers on a one-tick redstone pulse (Space at the wheel). */
export function pulseShipDispensers(ship, targets) {
  const blocks = ship.blockManager?.blocks;
  if (!blocks?.length) {
    return 0;
  }

  const powered = computePoweredTiles(ship);
  let fired = 0;
  let pulsed = 0;

  for (const block of blocks) {
    if (block.type !== 'dispenser') {
      continue;
    }
    if ((block.dispenserCooldown ?? 0) > 0) {
      continue;
    }
    if (!isDispenserPowered(block, powered)) {
      continue;
    }
    pulsed += 1;
    if (fireDispenserCharge(block, ship, targets)) {
      fired += 1;
    }
    block.dispenserCooldown = DISPENSER_COOLDOWN;
  }

  if (pulsed > 0 || powered.size > 0) {
    setRedstonePoweredVisual(ship, powered, true);
    ship.redstonePulseTimer = 0.2;
  }
  return fired;
}

export function updateShipRedstone(ship, _targets, deltaTime) {
  const blocks = ship.blockManager?.blocks;
  if (!blocks?.length) {
    return;
  }

  for (const block of blocks) {
    if (block.type !== 'dispenser') {
      continue;
    }
    block.dispenserCooldown = Math.max(0, (block.dispenserCooldown ?? 0) - deltaTime);
  }

  if ((ship.redstonePulseTimer ?? 0) > 0) {
    ship.redstonePulseTimer -= deltaTime;
    if (ship.redstonePulseTimer <= 0) {
      setRedstonePoweredVisual(ship, new Set(), false);
    }
  }
}
