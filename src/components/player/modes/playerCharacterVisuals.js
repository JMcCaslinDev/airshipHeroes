/**
 * Third-person camera offset from feet (exported for tests).
 */

import * as THREE from 'three';

export const THIRD_PERSON_BACK = 10;
export const THIRD_PERSON_HEIGHT = 3.2;
export const THIRD_PERSON_FOV = 70;
export const THIRD_PERSON_LOOK_Y = 1.4;

/**
 * @param {{ x: number, y: number, z: number }} feet
 * @param {number} _eyeHeight
 * @param {number} yaw
 */
export function computeThirdPersonCamera(feet, _eyeHeight, yaw) {
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));

  const behind = forward.clone().multiplyScalar(-THIRD_PERSON_BACK);

  return {
    position: {
      x: feet.x + behind.x,
      y: feet.y + THIRD_PERSON_HEIGHT,
      z: feet.z + behind.z
    },
    lookAt: {
      x: feet.x,
      y: feet.y + THIRD_PERSON_LOOK_Y,
      z: feet.z
    }
  };
}
