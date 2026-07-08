/**
 * Ship physics — blimp-like movement tuned from airshipwars feel.
 * ponytail: constants live here; scale differs from airshipwars (larger world).
 */

import * as THREE from 'three';

// Horizontal — airshipwars: maxSpeed 1.0, thrustPower 0.3, damping 0.98
const MAX_HORIZONTAL_SPEED = 6;
const FORWARD_ACCEL = 3.5;
const REVERSE_ACCEL = 2;
const LINEAR_DAMPING = 0.965;

// Turning — airshipwars: maxTurnRate 0.05/frame, angularDamping 0.95
const MAX_ANGULAR_SPEED = 0.32;
const TURN_ACCEL = 1.0;
const ANGULAR_DAMPING = 0.93;

// Vertical — airshipwars: maxVerticalSpeed 0.6, verticalThrustPower 0.15
const MAX_VERTICAL_SPEED = 2.5;
const VERTICAL_ACCEL = 1.5;
const VERTICAL_DAMPING = 0.94;

// Banking — lean into turns, spring back to level (no barrel rolls)
const MAX_BANK_ANGLE = 0.12;
const BANK_FACTOR = 0.4;
const BANK_RECOVERY = 4.5;

const LIFT_BLOCK_RATIO = 0.3;
const WORLD_RADIUS = 500;
const DEFAULT_WORLD_HEIGHT = 500;
const DEFAULT_SINK_RATE = 0.5;

export function updateShipPhysics(ship, worldManager, deltaTime, worldHeight = DEFAULT_WORLD_HEIGHT) {
  if (!ship) return;

  const blocks = ship.blockManager?.blocks;
  if (!blocks || blocks.length === 0) return;

  const liftBlocks = blocks.filter(block => block.type === 'lift').length;
  ship.isSinking = liftBlocks / blocks.length < LIFT_BLOCK_RATIO;

  applyControls(ship, deltaTime);
  applyDamping(ship, deltaTime);
  clampSpeeds(ship);

  if (ship.isSinking) {
    ship.velocity.y -= (ship.sinkRate || DEFAULT_SINK_RATE) * deltaTime;
  }

  updatePosition(ship, deltaTime);
  updateRotation(ship, deltaTime);
  applyBanking(ship, deltaTime);
  checkCollisions(ship, worldManager);
  enforceWorldBoundaries(ship, worldHeight);
}

function applyControls(ship, deltaTime) {
  if (!ship.controls) return;

  if (ship.controls.forward) {
    applyThrust(ship, FORWARD_ACCEL * deltaTime, ship.rotation);
  }
  if (ship.controls.backward) {
    applyThrust(ship, -REVERSE_ACCEL * deltaTime, ship.rotation);
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

function applyThrust(ship, thrust, rotation) {
  const force = rotateForce({ x: 0, y: 0, z: thrust }, rotation);
  ship.velocity.x += force.x;
  ship.velocity.z += force.z;
}

function applyDamping(ship, deltaTime) {
  const linearDamp = Math.pow(LINEAR_DAMPING, deltaTime * 60);
  ship.velocity.x *= linearDamp;
  ship.velocity.z *= linearDamp;

  if (!ship.controls?.up && !ship.controls?.down) {
    ship.velocity.y *= Math.pow(VERTICAL_DAMPING, deltaTime * 60);
  }

  ship.angularVelocity *= Math.pow(ANGULAR_DAMPING, deltaTime * 60);
}

function clampSpeeds(ship) {
  const hSpeed = Math.hypot(ship.velocity.x, ship.velocity.z);
  if (hSpeed > MAX_HORIZONTAL_SPEED) {
    const scale = MAX_HORIZONTAL_SPEED / hSpeed;
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

  if (lowestY < 1) {
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

  if (ship.position.y < 0) {
    ship.position.y = 0;
    ship.velocity.y = 0;
  }

  if (ship.group) {
    ship.group.position.set(ship.position.x, ship.position.y, ship.position.z);
  }
}

function rotateForce(force, rotation) {
  const vector = new THREE.Vector3(force.x, force.y, force.z);
  vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);

  return { x: vector.x, y: vector.y, z: vector.z };
}
