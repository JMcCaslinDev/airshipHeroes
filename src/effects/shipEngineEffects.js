/**
 * Engine flame visibility — on only while the ship is moving.
 */

import { updateEngineFlameMesh } from './engineFlame.js';
import { BOOST_FLAME_SCALE } from '../physics/shipBoost.js';

const MOVE_SPEED_THRESHOLD = 0.12;

export function isShipMoving(ship) {
  if (!ship) {
    return false;
  }

  const controls = ship.controls;
  if (
    controls?.forward ||
    controls?.backward ||
    controls?.left ||
    controls?.right ||
    controls?.up ||
    controls?.down
  ) {
    return true;
  }

  const v = ship.velocity ?? { x: 0, y: 0, z: 0 };
  return Math.hypot(v.x, v.y, v.z) > MOVE_SPEED_THRESHOLD;
}

export function updateShipEngineFlames(ship, deltaTime) {
  if (!ship?.blockManager?.blocks) {
    return;
  }

  const moving = isShipMoving(ship);
  const boosting = !!(moving && ship.boostActive);
  const scale = boosting ? BOOST_FLAME_SCALE : 1;

  for (const block of ship.blockManager.blocks) {
    if (block.type !== 'engine') {
      continue;
    }
    block.setFlameActive?.(moving);
    if (block.flameMesh) {
      block.flameMesh.scale.set(scale, scale * (boosting ? 1.15 : 1), scale);
      if (block.flameMesh.userData.plumeUniforms) {
        // Extra smoke/fire intensity while boosting
        block.flameMesh.userData.boostGain = boosting ? 1.45 : 1;
      }
    }
    if (moving) {
      block.updateFlame?.(deltaTime);
    }
  }
}

export { updateEngineFlameMesh };
