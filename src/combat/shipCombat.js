import {
  BLOCK_MAX_HEALTH,
  BLOCK_HEAL_DELAY,
  BLOCK_HEAL_PER_SECOND,
  DEATH_SINK_RATE,
  GROUND_CRASH_Y,
  LIFT_SINK_HORIZONTAL_DRAG,
  LIFT_SINK_RATE_MAX,
  LIFT_SINK_RATE_MIN,
  MIN_LIFT_RATIO
} from './shipCombatConfig.js';
import { creditShipDamage, tryAwardKillCredit } from './damageAttribution.js';

export function getLiftRatio(ship) {
  const blocks = ship.blockManager?.blocks;
  if (!blocks?.length) {
    return 0;
  }
  const liftCount = blocks.filter((b) => b.type === 'lift').length;
  return liftCount / blocks.length;
}

export function hasEnoughLift(ship) {
  return getLiftRatio(ship) >= MIN_LIFT_RATIO;
}

/**
 * How far below min lift (0 = at threshold, 1 = zero lift).
 * Above min lift → 0 (not sinking from lift).
 */
export function getLiftDeficit(liftRatio) {
  if (liftRatio >= MIN_LIFT_RATIO) {
    return 0;
  }
  return 1 - Math.max(0, liftRatio) / MIN_LIFT_RATIO;
}

/**
 * Sink rate + horizontal drag from remaining lift %.
 * 0 lift → max rate + strong drag (steep drop). Near min → mild arc.
 */
export function computeLiftSinkProfile(liftRatio) {
  const deficit = getLiftDeficit(liftRatio);
  return {
    sinkRate: LIFT_SINK_RATE_MIN + deficit * (LIFT_SINK_RATE_MAX - LIFT_SINK_RATE_MIN),
    horizontalDrag: deficit * LIFT_SINK_HORIZONTAL_DRAG
  };
}

/**
 * Clamp per-block HP and sync ship.liftRatio.
 * Ship "health" is lift ratio — aggregate block HP is not shown.
 */
export function recalculateShipHealth(ship) {
  const blocks = ship.blockManager?.blocks ?? [];
  for (const block of blocks) {
    const max = block.maxHealth ?? BLOCK_MAX_HEALTH[block.type] ?? 10;
    block.maxHealth = max;
    block.health = Math.max(0, Math.min(block.health ?? max, max));
  }

  const liftRatio = getLiftRatio(ship);
  ship.liftRatio = liftRatio;
  // Legacy fields: healthPercent mirrors lift so old callers stay meaningful
  ship.healthPercent = liftRatio;
  ship.health = blocks.length;
  ship.maxHealth = Math.max(1, blocks.length);
}

export function updateSinkingState(ship, hooks = null) {
  const prevState = ship.sinkState ?? 'none';
  const liftRatio = getLiftRatio(ship);
  ship.liftRatio = liftRatio;
  ship.healthPercent = liftRatio;
  const liftOk = liftRatio >= MIN_LIFT_RATIO;
  // Death = hull gone; low lift = recoverable sink
  const alive = (ship.blockManager?.blocks?.length ?? 0) > 0;
  // ponytail: fall back to arena combat hooks when callers omit them
  const h = hooks
    ?? (typeof window !== 'undefined' ? window.gameState?.arenaCombatContext?.hooks : null)
    ?? {};

  if (!alive) {
    ship.sinkState = 'death';
    ship.isSinking = true;
    ship.sinkRate = DEATH_SINK_RATE;
    ship.sinkHorizontalDrag = LIFT_SINK_HORIZONTAL_DRAG;
  } else if (!liftOk) {
    const profile = computeLiftSinkProfile(liftRatio);
    ship.sinkState = 'lift';
    ship.isSinking = true;
    ship.sinkRate = profile.sinkRate;
    ship.sinkHorizontalDrag = profile.horizontalDrag;
  } else {
    ship.sinkState = 'none';
    ship.isSinking = false;
    ship.sinkHorizontalDrag = 0;
  }

  const victim = ship.owner;
  const attacker = ship.lastDamagedBy;
  const victimName = victim?.username;
  const attackerName = attacker?.username;

  // Started sinking (lift or death) — announce, but only award kill on death
  if (ship.sinkState !== 'none' && prevState === 'none') {
    if (attackerName && victimName && attackerName !== victimName) {
      h.onCombatMessage?.(`${attackerName} is sinking ${victimName}`);
    } else if (victimName) {
      h.onCombatMessage?.(`${victimName} is sinking`);
    }
    if (ship.sinkState === 'death') {
      tryAwardKillCredit(ship, h);
    }
  }

  // Recovered from lift sink
  if (prevState === 'lift' && ship.sinkState === 'none') {
    if (attackerName && victimName && attackerName !== victimName) {
      h.onCombatMessage?.(`${victimName} recovered from an attack by ${attackerName}`);
    } else if (victimName) {
      h.onCombatMessage?.(`${victimName} recovered`);
    }
  }

  // Escalated to death sink while already lift-sinking
  if (prevState === 'lift' && ship.sinkState === 'death') {
    tryAwardKillCredit(ship, h);
  }
}

export function damageShipBlock(ship, block, amount, onBlockBroken, attacker = null, hooks = null) {
  if (!block) {
    return false;
  }
  // Primary control is invulnerable; extras (isExtraControl) can be damaged
  if ((block.type === 'control' || block.type === 'steeringWheel') && !block.isExtraControl) {
    return false;
  }

  if (attacker) {
    creditShipDamage(ship, attacker);
  }

  const max = block.maxHealth ?? BLOCK_MAX_HEALTH[block.type] ?? 10;
  block.maxHealth = max;
  block.health = (block.health ?? max) - amount;
  block._healDelay = BLOCK_HEAL_DELAY;

  if (block.health > 0) {
    // Extra controls stay red while damaged
    if (!block.isExtraControl && block.mesh?.material?.color) {
      const ratio = block.health / max;
      block.mesh.material.color.setRGB(ratio, ratio * 0.85, ratio * 0.85);
    }
    return false;
  }

  block.isBurning = false;
  ship.blockManager.removeBlock({ ...block.position });
  recalculateShipHealth(ship);
  updateSinkingState(ship, hooks);
  onBlockBroken?.(ship, block);
  return true;
}

/**
 * Slowly restore damaged blocks that weren't destroyed (after a short delay).
 */
export function healShipBlocks(ship, deltaTime) {
  const blocks = ship?.blockManager?.blocks;
  if (!blocks?.length || deltaTime <= 0) {
    return;
  }

  let changed = false;
  for (const block of blocks) {
    const max = block.maxHealth ?? BLOCK_MAX_HEALTH[block.type] ?? 10;
    block.maxHealth = max;
    if ((block.health ?? max) >= max) {
      block.health = max;
      block._healDelay = 0;
      continue;
    }
    if (block.isBurning) {
      continue;
    }

    const delay = block._healDelay ?? 0;
    if (delay > 0) {
      block._healDelay = delay - deltaTime;
      continue;
    }

    block.health = Math.min(max, (block.health ?? 0) + BLOCK_HEAL_PER_SECOND * deltaTime);
    changed = true;
    if (!block.isExtraControl && block.mesh?.material?.color) {
      const ratio = block.health / max;
      block.mesh.material.color.setRGB(ratio, ratio * 0.85, ratio * 0.85);
    }
  }

  if (changed) {
    recalculateShipHealth(ship);
  }
}

export function getLowestShipY(ship) {
  const blocks = ship.blockManager?.blocks;
  if (!blocks?.length) {
    return ship.position.y;
  }
  const lowest = blocks.reduce((min, b) => (b.position.y < min.position.y ? b : min), blocks[0]);
  return ship.position.y + lowest.position.y;
}

export function checkShipGroundCrash(ship) {
  if (!ship?.isSinking || ship.isDestroyed) {
    return false;
  }
  return getLowestShipY(ship) <= GROUND_CRASH_Y;
}

export function updateShipCombat(ship, targets, deltaTime, hooks) {
  if (!ship || ship.isDestroyed) {
    return;
  }

  healShipBlocks(ship, deltaTime);
  updateSinkingState(ship, hooks);
}
