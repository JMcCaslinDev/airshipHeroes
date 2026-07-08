/** Arena spawn tuning — ships deploy above the landscape, not at origin. */

import { computeShipPerformanceFromShip } from '../physics/shipPerformance.js';

export const SPAWN_Y_MIN = 48;
export const SPAWN_Y_MAX = 76;
export const SPAWN_RADIUS_MIN = 45;
export const SPAWN_RADIUS_MAX = 200;
export const SPAWN_SPEED_MIN = 3;
export const SPAWN_SPEED_MAX = 5.5;

/**
 * Random deploy point above the map with inbound heading and cruise speed.
 * @param {() => number} [rng]
 */
export function pickArenaSpawn(rng = Math.random) {
  const angle = rng() * Math.PI * 2;
  const radius = SPAWN_RADIUS_MIN + rng() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
  const y = SPAWN_Y_MIN + rng() * (SPAWN_Y_MAX - SPAWN_Y_MIN);
  const rotation = angle + Math.PI;
  const speed = SPAWN_SPEED_MIN + rng() * (SPAWN_SPEED_MAX - SPAWN_SPEED_MIN);

  return {
    position: {
      x: Math.cos(angle) * radius,
      y,
      z: Math.sin(angle) * radius
    },
    rotation,
    speed
  };
}

export function applySpawnToShip(ship, spawn) {
  if (!ship || !spawn) {
    return;
  }

  ship.position.x = spawn.position.x;
  ship.position.y = spawn.position.y;
  ship.position.z = spawn.position.z;
  ship.rotation = spawn.rotation;

  if (ship.group) {
    ship.group.position.set(spawn.position.x, spawn.position.y, spawn.position.z);
    ship.group.rotation.y = spawn.rotation;
  }

  const perf = computeShipPerformanceFromShip(ship);
  ship.performance = perf;
  ship.maxSpeed = perf.maxSpeed;

  let speed = spawn.speed ?? SPAWN_SPEED_MIN;
  speed = Math.min(speed, Math.max(0, perf.maxSpeed));
  ship.velocity.x = Math.sin(spawn.rotation) * speed;
  ship.velocity.y = 0;
  ship.velocity.z = Math.cos(spawn.rotation) * speed;
  ship.angularVelocity = 0;
}
