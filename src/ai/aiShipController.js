/**
 * Arena AI — wander by default, RNG ram windows, avoid stacking; bots prefer the human.
 */

const TURN_THRESHOLD = 0.15;
const ALTITUDE_MATCH = 3;
const AI_MODE_MIN = 3;
const AI_MODE_MAX = 6;
const AI_RAM_CHANCE = 0.38;
const AI_RAM_RANGE_MIN = 16;
const AI_RAM_RANGE_MAX = 60;
const AI_TOO_CLOSE = 13;
const AI_BOT_VS_BOT_RAM_CHANCE = 0.12;

export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) {
    a -= Math.PI * 2;
  }
  while (a < -Math.PI) {
    a += Math.PI * 2;
  }
  return a;
}

function emptyControls() {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  };
}

function horizontalDist(ship, other) {
  return Math.hypot(
    other.position.x - ship.position.x,
    other.position.z - ship.position.z
  );
}

/**
 * @param {Object} ship
 * @param {Object|null} targetShip
 * @returns {Object} ship.controls flags
 */
export function computeRamControls(ship, targetShip) {
  const controls = emptyControls();

  if (!ship || !targetShip) {
    controls.forward = true;
    return controls;
  }

  const dx = targetShip.position.x - ship.position.x;
  const dz = targetShip.position.z - ship.position.z;
  const targetAngle = Math.atan2(dx, dz);
  const angleDiff = normalizeAngle(targetAngle - (ship.rotation ?? 0));

  if (angleDiff > TURN_THRESHOLD) {
    controls.left = true;
  } else if (angleDiff < -TURN_THRESHOLD) {
    controls.right = true;
  } else {
    controls.forward = true;
  }

  const dy = targetShip.position.y - ship.position.y;
  if (dy > ALTITUDE_MATCH) {
    controls.up = true;
  } else if (dy < -ALTITUDE_MATCH) {
    controls.down = true;
  }

  return controls;
}

/** Steer away from another hull to prevent stacking. */
export function computeAvoidControls(ship, otherShip) {
  const controls = emptyControls();
  if (!ship || !otherShip) {
    return controls;
  }

  const dx = ship.position.x - otherShip.position.x;
  const dz = ship.position.z - otherShip.position.z;
  const fleeAngle = Math.atan2(dx, dz);
  const angleDiff = normalizeAngle(fleeAngle - (ship.rotation ?? 0));

  if (angleDiff > TURN_THRESHOLD) {
    controls.left = true;
  } else if (angleDiff < -TURN_THRESHOLD) {
    controls.right = true;
  } else {
    controls.backward = true;
  }

  return controls;
}

function wanderControls(ship, deltaTime) {
  const controls = emptyControls();
  controls.forward = true;

  if (ship.aiWanderTimer === undefined) {
    ship.aiWanderTimer = 0;
    ship.aiTurnDir = 1;
  }

  ship.aiWanderTimer -= deltaTime;
  if (ship.aiWanderTimer <= 0) {
    ship.aiTurnDir = Math.random() > 0.5 ? 1 : -1;
    ship.aiWanderTimer = 2 + Math.random() * 3;
  }

  if (ship.aiTurnDir > 0) {
    controls.left = true;
  } else {
    controls.right = true;
  }

  return controls;
}

function findNearestShip(ship, targets) {
  let nearest = null;
  let nearestDist = Infinity;

  for (const target of targets) {
    const other = target?.ship;
    if (!other || other === ship || other.isDestroyed) {
      continue;
    }
    const dist = horizontalDist(ship, other);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = other;
    }
  }

  return nearest;
}

function pickAttackTarget(ship, targets, rng = Math.random) {
  const human = targets.find((t) => t?.isLocal && t.ship && !t.ship.isDestroyed);
  if (human?.ship) {
    return human.ship;
  }

  const nearest = findNearestShip(ship, targets);
  if (!nearest || rng() > AI_BOT_VS_BOT_RAM_CHANCE) {
    return null;
  }
  return nearest;
}

function rollAiMode(ship, attackTarget, dist, rng = Math.random) {
  if (!attackTarget) {
    return 'wander';
  }
  if (dist < AI_TOO_CLOSE) {
    return 'avoid';
  }
  if (dist < AI_RAM_RANGE_MIN || dist > AI_RAM_RANGE_MAX) {
    return 'wander';
  }
  return rng() < AI_RAM_CHANCE ? 'ram' : 'wander';
}

export function updateAiRamControls(ship, targets, deltaTime, rng = Math.random) {
  if (!ship) {
    return;
  }

  ship.aiModeTimer = (ship.aiModeTimer ?? 0) - deltaTime;
  if (ship.aiModeTimer <= 0) {
    const attackTarget = pickAttackTarget(ship, targets, rng);
    const dist = attackTarget ? horizontalDist(ship, attackTarget) : Infinity;
    ship.aiMode = rollAiMode(ship, attackTarget, dist, rng);
    ship.aiAttackTarget = attackTarget;
    ship.aiModeTimer = AI_MODE_MIN + rng() * (AI_MODE_MAX - AI_MODE_MIN);
  }

  const nearest = findNearestShip(ship, targets);
  const nearestDist = nearest ? horizontalDist(ship, nearest) : Infinity;
  let controls;

  if (nearestDist < AI_TOO_CLOSE && ship.aiMode !== 'ram') {
    controls = computeAvoidControls(ship, nearest);
  } else if (ship.aiMode === 'ram' && ship.aiAttackTarget) {
    controls = computeRamControls(ship, ship.aiAttackTarget);
  } else if (ship.aiMode === 'avoid' && nearest) {
    controls = computeAvoidControls(ship, nearest);
  } else {
    controls = wanderControls(ship, deltaTime);
  }

  ship.controls = { ...ship.controls, ...controls };
}
