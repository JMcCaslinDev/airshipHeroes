/**
 * Ship Mode Module
 *
 * Handles controls and third-person orbit camera for Ship Mode.
 * Mouse orbits/zooms the camera; WASD + Q/E drive the ship.
 */

import * as THREE from 'three';
import { getControlBlockFeetWorld } from '../physics/shipLocalCollision.js';

import { pulseShipDispensers } from '../combat/redstoneSystem.js';

const CAMERA_SENSITIVITY = 0.003;
const WHEEL_ORBIT_SENSITIVITY = 0.002;
const MIN_CAMERA_DISTANCE = 8;
const MAX_CAMERA_DISTANCE = 60;
const DEFAULT_CAMERA_DISTANCE = 25;
const ZOOM_STEP = 2;
const MOUSE_WHEEL_DELTA_THRESHOLD = 40;

/**
 * Create a ship mode controller
 * @param {Object} player - The player
 * @param {THREE.Camera} camera - The camera
 * @param {Object} world - The world object
 * @returns {Object} The ship mode controller
 */
export function createShipModeController(player, camera, world) {
  let active = false;
  let prevSpaceDown = false;

  // Orbit camera around ship (world space — independent of ship heading)
  let cameraYaw = 0;
  let cameraPitch = 0.35;
  let cameraDistance = DEFAULT_CAMERA_DISTANCE;

  function activate() {
    active = true;
    player.mode = 'ship';

    const feet = getControlBlockFeetWorld(player.ship);
    if (feet && player.character) {
      player.character.position.x = feet.x;
      player.character.position.y = feet.y;
      player.character.position.z = feet.z;
      player.character.showShipModeOutline(feet, player.ship);
    } else if (player.character?.position && player.ship) {
      player.character.showShipModeOutline(player.character.position, player.ship);
    }

    updateCamera();
  }

  function deactivate() {
    active = false;
    player.character?.hideShipModeOutline?.();
    // Keep thrust latched when leaving ship mode (player walks deck while ship coasts/thrusts)
    // Clear only turn / vertical / boost — forward/back persist until press+release in ship mode
    if (player.ship?.controls) {
      player.ship.controls.left = false;
      player.ship.controls.right = false;
      player.ship.controls.up = false;
      player.ship.controls.down = false;
      player.ship.controls.boost = false;
      if (player.ship.controls.forward || player.ship.controls.backward) {
        player.ship.thrustLatch = {
          forward: !!player.ship.controls.forward,
          backward: !!player.ship.controls.backward,
          sawRelease: false
        };
      }
    }
  }

  function handleInput(keys) {
    if (!active || !player.ship) return;

    const forwardDown = !!(keys.forward || keys.w);
    const backwardDown = !!(keys.backward || keys.s);
    const latch = player.ship.thrustLatch;

    // Intro-style latch: keep thrusting after mode switch until press then release
    if (latch) {
      if (!latch.sawRelease) {
        if (forwardDown || backwardDown) {
          latch.sawRelease = true;
        }
        player.ship.controls = {
          forward: latch.forward || forwardDown,
          backward: latch.backward || backwardDown,
          left: !!(keys.left || keys.a),
          right: !!(keys.right || keys.d),
          up: !!keys.q,
          down: !!keys.e,
          boost: !!keys.sprint
        };
      } else {
        player.ship.controls = {
          forward: forwardDown,
          backward: backwardDown,
          left: !!(keys.left || keys.a),
          right: !!(keys.right || keys.d),
          up: !!keys.q,
          down: !!keys.e,
          boost: !!keys.sprint
        };
        if (!forwardDown && !backwardDown) {
          player.ship.thrustLatch = null;
        }
      }
    } else {
      player.ship.controls = {
        forward: forwardDown,
        backward: backwardDown,
        left: !!(keys.left || keys.a),
        right: !!(keys.right || keys.d),
        up: !!keys.q,
        down: !!keys.e,
        boost: !!keys.sprint
      };
    }

    const spaceDown = !!keys.up;
    if (spaceDown && !prevSpaceDown) {
      const targets = typeof window !== 'undefined'
        ? window.gameState?.arenaCombatContext?.targets
          ?? Array.from(window.gameState?.players?.values?.() ?? [])
        : [];
      pulseShipDispensers(player.ship, targets);
    }
    prevSpaceDown = spaceDown;
  }

  function clampPitch() {
    cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraPitch));
  }

  function adjustZoom(deltaY) {
    const direction = Math.sign(deltaY) || 1;
    cameraDistance += direction * ZOOM_STEP;
    cameraDistance = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, cameraDistance));
  }

  function handleMouseMove(deltaX, deltaY) {
    if (!active) return;

    cameraYaw -= deltaX * CAMERA_SENSITIVITY;
    cameraPitch -= deltaY * CAMERA_SENSITIVITY;
    clampPitch();

    updateCamera();
  }

  /**
   * @param {number} deltaY
   * @param {number} deltaX
   * @param {{ ctrlKey?: boolean }} [modifiers]
   */
  function handleMouseWheel(deltaY, deltaX = 0, modifiers = {}) {
    if (!active) return;

    // Trackpad pinch-zoom (macOS sends wheel + ctrlKey)
    if (modifiers.ctrlKey) {
      adjustZoom(deltaY);
      updateCamera();
      return;
    }

    // Trackpad two-finger pan → orbit (wheel with deltaX / small deltaY)
    if (deltaX !== 0) {
      cameraYaw -= deltaX * WHEEL_ORBIT_SENSITIVITY;
      cameraPitch -= deltaY * WHEEL_ORBIT_SENSITIVITY;
      clampPitch();
      updateCamera();
      return;
    }

    // Vertical only: mouse wheel notch = zoom; small delta = trackpad pitch orbit
    if (Math.abs(deltaY) >= MOUSE_WHEEL_DELTA_THRESHOLD) {
      adjustZoom(deltaY);
    } else if (deltaY !== 0) {
      cameraPitch -= deltaY * WHEEL_ORBIT_SENSITIVITY;
      clampPitch();
    }

    updateCamera();
  }

  function getShipOrbitTarget() {
    const feet = getControlBlockFeetWorld(player.ship);
    if (feet) {
      return new THREE.Vector3(feet.x, feet.y, feet.z);
    }
    return new THREE.Vector3(
      player.ship.position.x,
      player.ship.position.y,
      player.ship.position.z
    );
  }

  function updateCamera() {
    if (!active || !player.ship) return;

    const target = getShipOrbitTarget();

    const cosPitch = Math.cos(cameraPitch);
    const offset = new THREE.Vector3(
      Math.sin(cameraYaw) * cosPitch * cameraDistance,
      Math.sin(cameraPitch) * cameraDistance,
      Math.cos(cameraYaw) * cosPitch * cameraDistance
    );

    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  }

  function setOrbitAngles(pitch, yaw) {
    cameraPitch = pitch;
    cameraYaw = yaw;
    clampPitch();
    updateCamera();
  }

  function update() {
    if (!active || !player.ship) return;
    // Keep Steve glued to the control block while in ship mode
    if (player.character?.showShipModeOutline) {
      const feet = getControlBlockFeetWorld(player.ship);
      if (feet) {
        player.character.position.x = feet.x;
        player.character.position.y = feet.y;
        player.character.position.z = feet.z;
        player.character.showShipModeOutline(feet, player.ship);
      }
    }
    updateCamera();
  }

  return {
    activate,
    deactivate,
    handleInput,
    handleMouseMove,
    handleMouseWheel,
    updateCamera,
    setOrbitAngles,
    update,
    get active() {
      return active;
    },
    get player() {
      return player;
    },
    get camera() {
      return camera;
    },
    get cameraDistance() {
      return cameraDistance;
    }
  };
}

/**
 * Create a third-person camera for ship mode
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {THREE.Camera} - The third-person camera
 */
export function createShipCamera(scene) {
  const cam = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  cam.position.set(0, 5, 10);
  scene.add(cam);

  return cam;
}

/**
 * Create a HUD for ship mode
 * @param {Object} player - The player object
 * @returns {Object} - The HUD object
 */
export function createShipHUD(player) {
  const hud = {
    player,
    elements: {},

    init() {
      this.elements.speed = document.createElement('div');
      this.elements.speed.id = 'ship-speed';
      Object.assign(this.elements.speed.style, {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px'
      });
      this.elements.speed.textContent = 'Speed: 0';

      this.elements.altitude = document.createElement('div');
      this.elements.altitude.id = 'ship-altitude';
      Object.assign(this.elements.altitude.style, {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px'
      });
      this.elements.altitude.textContent = 'Altitude: 0';

      document.body.appendChild(this.elements.speed);
      document.body.appendChild(this.elements.altitude);
      this.hide();
    },

    show() {
      for (const element of Object.values(this.elements)) {
        element.style.display = 'block';
      }
    },

    hide() {
      for (const element of Object.values(this.elements)) {
        element.style.display = 'none';
      }
    },

    update() {
      if (!this.player?.ship) return;

      if (this.player.mode === 'ship') {
        this.show();
      } else {
        this.hide();
        return;
      }

      const speed = Math.sqrt(
        this.player.ship.velocity.x ** 2 + this.player.ship.velocity.z ** 2
      ).toFixed(1);

      this.elements.speed.textContent = `Speed: ${speed}`;
      this.elements.altitude.textContent = `Altitude: ${Math.floor(this.player.ship.position.y)}`;
    },

    destroy() {
      for (const element of Object.values(this.elements)) {
        element.parentNode?.removeChild(element);
      }
    }
  };

  return hud;
}
