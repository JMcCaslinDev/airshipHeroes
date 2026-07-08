/**
 * Ship physics — blimp-like movement tuned from airshipwars feel.
 * ponytail: constants live here; scale differs from airshipwars (larger world).
 */

import {
  DEATH_SINK_RATE,
  LIFT_SINK_RATE_MIN
} from '../combat/shipCombatConfig.js';
import { updateSinkingState } from '../combat/shipCombat.js';
import { computeShipPerformanceFromShip, SHIP_DECEL } from './shipPerformance.js';
import { getBoostAccelMultiplier, updateShipBoost } from './shipBoost.js';

// Horizontal — blimp ramp; cruise = half max, boost unlocks full
const REVERSE_ACCEL_FACTOR = 0.6;
const LATERAL_DAMPING = 0.978;

// Turning
const MAX_ANGULAR_SPEED = 0.32;
const TURN_ACCEL = 1.0;
const ANGULAR_DAMPING = 0.93;

// Vertical
const MAX_VERTICAL_SPEED = 2.5;
const VERTICAL_ACCEL = 1.5;
const VERTICAL_DAMPING = 0.94;

// Banking
const MAX_BANK_ANGLE = 0.12;
const BANK_FACTOR = 0.4;
const BANK_RECOVERY = 4.5;

const WORLD_RADIUS = 500;
const DEFAULT_WORLD_HEIGHT = 500;

export function updateShipPhysics(ship, worldManager, deltaTime, worldHeight = DEFAULT_WORLD_HEIGHT) {
  if (!ship) return;

  const blocks = ship.blockManager?.blocks;
  if (!blocks || blocks.length === 0) return;

  const perf = computeShipPerformanceFromShip(ship);
  ship.performance = perf;
  ship.maxSpeed = perf.maxSpeed;
  ship.cruiseMaxSpeed = perf.cruiseMaxSpeed;

  const thrusting = !!(ship.controls?.forward || ship.controls?.backward);
  const wantBoost = !!(
    ship.controls?.boost
    && thrusting
    && perf.maxSpeed > 0
  );
  updateShipBoost(ship, deltaTime, wantBoost);

  updateSinkingState(ship);

  applyControls(ship, deltaTime, perf);
  applyDamping(ship, deltaTime, perf);
  clampSpeeds(ship, perf);

  if (ship.isSinking) {
    applySinkMotion(ship, deltaTime);
  }

  updatePosition(ship, deltaTime);
  updateRotation(ship, deltaTime);
  applyBanking(ship, deltaTime);
  checkCollisions(ship, worldManager);
  enforceWorldBoundaries(ship, worldHeight);
}

/** Downward accel + optional horizontal kill for steep (low-lift) drops. */
function applySinkMotion(ship, deltaTime) {
  const rate = ship.sinkRate
    ?? (ship.sinkState === 'death' ? DEATH_SINK_RATE : LIFT_SINK_RATE_MIN);
  ship.velocity.y -= rate * deltaTime;

  const drag = Math.max(0, Math.min(1, ship.sinkHorizontalDrag ?? 0));
  if (drag > 0) {
    // ponytail: frame-rate independent lerp toward 0 — upgrade path: proper aero drag
    const keep = Math.pow(1 - drag, deltaTime * 60);
    ship.velocity.x *= keep;
    ship.velocity.z *= keep;
  }
}

function applyControls(ship, deltaTime, perf) {
  if (!ship.controls) return;

  const accel = (perf?.accel ?? 0.9) * getBoostAccelMultiplier(ship);
  const cruiseMax = perf?.cruiseMaxSpeed ?? (perf?.maxSpeed ?? 0) * 0.5;
  const absoluteMax = perf?.maxSpeed ?? 0;
  // Boost unlocks upper 50%; otherwise cruise cap
  const forwardCap = ship.boostActive ? absoluteMax : cruiseMax;
  const reverseMax = perf?.reverseMaxSpeed ?? 0;
  const thrusting = !!(ship.controls.forward || ship.controls.backward);

  if (thrusting) {
    const fx = Math.sin(ship.rotation);
    const fz = Math.cos(ship.rotation);
    let along = ship.velocity.x * fx + ship.velocity.z * fz;
    const latX = ship.velocity.x - along * fx;
    const latZ = ship.velocity.z - along * fz;

    if (ship.controls.forward && forwardCap > 0) {
      if (along < forwardCap) {
        along = Math.min(forwardCap, along + accel * deltaTime);
      } else if (along > forwardCap) {
        // Drop out of boost band toward cruise while still holding W
        along = Math.max(forwardCap, along - SHIP_DECEL * deltaTime);
      }
    } else if (ship.controls.backward && reverseMax > 0) {
      if (along > -reverseMax) {
        along = Math.max(-reverseMax, along - accel * REVERSE_ACCEL_FACTOR * deltaTime);
      }
    }

    ship.velocity.x = along * fx + latX;
    ship.velocity.z = along * fz + latZ;
    ship._thrusting = (ship.controls.forward && forwardCap > 0)
      || (ship.controls.backward && reverseMax > 0);
  } else {
    ship._thrusting = false;
  }

  if (ship.controls.left) {
    ship.angularVelocity += TURN_ACCEL * deltaTime;
  }
  if (ship.controls.right) {
    ship.angularVelocity -= TURN_ACCEL * deltaTime;
  }

  if (ship.controls.up) {
    ship.velocity.y += VERTICAL_ACCEL * deltaTime;
  } else if (ship.controls.down) {
    ship.velocity.y -= VERTICAL_ACCEL * deltaTime;
  }
}

function applyDamping(ship, deltaTime, perf) {
  const fx = Math.sin(ship.rotation);
  const fz = Math.cos(ship.rotation);
  let along = ship.velocity.x * fx + ship.velocity.z * fz;
  let latX = ship.velocity.x - along * fx;
  let latZ = ship.velocity.z - along * fz;

  // Bleed sideways always
  const latDamp = Math.pow(LATERAL_DAMPING, deltaTime * 60);
  latX *= latDamp;
  latZ *= latDamp;

  const cruiseMax = perf?.cruiseMaxSpeed ?? (perf?.maxSpeed ?? 0) * 0.5;

  // Coast: gradual linear decel. Above cruise (post-boost) bleed down to cruise first.
  if (!ship._thrusting) {
    if (along > cruiseMax) {
      along = Math.max(cruiseMax, along - SHIP_DECEL * deltaTime);
    } else if (along > 0) {
      along = Math.max(0, along - SHIP_DECEL * deltaTime);
    } else if (along < 0) {
      along = Math.min(0, along + SHIP_DECEL * deltaTime);
    }
  }

  ship.velocity.x = along * fx + latX;
  ship.velocity.z = along * fz + latZ;

  if (!ship.controls?.up && !ship.controls?.down) {
    ship.velocity.y *= Math.pow(VERTICAL_DAMPING, deltaTime * 60);
  }

  ship.angularVelocity *= Math.pow(ANGULAR_DAMPING, deltaTime * 60);
}

function clampSpeeds(ship, perf) {
  const cruiseMax = perf?.cruiseMaxSpeed ?? 0;
  const absoluteMax = Math.max(0, perf?.maxSpeed ?? ship.maxSpeed ?? 0);
  const cap = ship.boostActive ? absoluteMax : cruiseMax;
  const hSpeed = Math.hypot(ship.velocity.x, ship.velocity.z);

  // If we were boosting and drop out of boost above cruise, ease down via decel (don't hard-clip)
  if (cap <= 0) {
    ship.velocity.x = 0;
    ship.velocity.z = 0;
  } else if (ship.boostActive && hSpeed > absoluteMax) {
    const scale = absoluteMax / hSpeed;
    ship.velocity.x *= scale;
    ship.velocity.z *= scale;
  } else if (!ship.boostActive && hSpeed > absoluteMax) {
    // Never exceed absolute max even when coasting from a boost
    const scale = absoluteMax / hSpeed;
    ship.velocity.x *= scale;
    ship.velocity.z *= scale;
  }

  ship.angularVelocity = Math.max(-MAX_ANGULAR_SPEED, Math.min(MAX_ANGULAR_SPEED, ship.angularVelocity));
  ship.velocity.y = Math.max(-MAX_VERTICAL_SPEED, Math.min(MAX_VERTICAL_SPEED, ship.velocity.y));
}

function applyBanking(ship, deltaTime) {
  if (ship.bankAngle === undefined) {
    ship.bankAngle = 0;
  }

  const targetBank = Math.max(
    -MAX_BANK_ANGLE,
    Math.min(MAX_BANK_ANGLE, -ship.angularVelocity * BANK_FACTOR)
  );

  ship.bankAngle += (targetBank - ship.bankAngle) * BANK_RECOVERY * deltaTime;

  if (ship.group) {
    ship.group.rotation.z = ship.bankAngle;
  }
}

export function applyForce(ship, force) {
  ship.velocity.x += force.x;
  ship.velocity.y += force.y;
  ship.velocity.z += force.z;
}

export function applyTorque(ship, torque) {
  ship.angularVelocity += torque;
}

export function updatePosition(ship, deltaTime) {
  ship.position.x += ship.velocity.x * deltaTime;
  ship.position.y += ship.velocity.y * deltaTime;
  ship.position.z += ship.velocity.z * deltaTime;

  if (ship.group) {
    ship.group.position.set(ship.position.x, ship.position.y, ship.position.z);
  }
}

export function updateRotation(ship, deltaTime) {
  ship.rotation += ship.angularVelocity * deltaTime;
  ship.rotation = ship.rotation % (Math.PI * 2);
  if (ship.rotation < 0) {
    ship.rotation += Math.PI * 2;
  }

  if (ship.group) {
    ship.group.rotation.y = ship.rotation;
  }
}

export function checkCollisions(ship, worldManager) {
  const blocks = ship.blockManager?.blocks;
  if (!blocks || blocks.length === 0) {
    return false;
  }

  const lowestBlock = blocks.reduce((lowest, block) =>
    block.position.y < lowest.position.y ? block : lowest
  , blocks[0]);

  const lowestY = ship.position.y + lowestBlock.position.y;

  if (lowestY < 1 && !ship.isSinking) {
    ship.position.y += (1 - lowestY);
    ship.velocity.y = 0;
    if (ship.group) {
      ship.group.position.y = ship.position.y;
    }
    return true;
  }

  return false;
}

export function enforceWorldBoundaries(ship, worldHeight = DEFAULT_WORLD_HEIGHT) {
  const distance = Math.hypot(ship.position.x, ship.position.z);

  if (distance > WORLD_RADIUS) {
    const angle = Math.atan2(ship.position.z, ship.position.x);
    ship.position.x = Math.cos(angle) * WORLD_RADIUS;
    ship.position.z = Math.sin(angle) * WORLD_RADIUS;
    ship.velocity.x *= -0.3;
    ship.velocity.z *= -0.3;
  }

  if (ship.position.y > worldHeight) {
    ship.position.y = worldHeight;
    ship.velocity.y = 0;
  }

  if (ship.position.y < 0 && !ship.isSinking) {
    ship.position.y = 0;
    ship.velocity.y = 0;
  }

  if (ship.group) {
    ship.group.position.set(ship.position.x, ship.position.y, ship.position.z);
  }
}

