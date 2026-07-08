/**
 * Ship Mode Module
 *
 * Handles controls and third-person orbit camera for Ship Mode.
 * Mouse orbits/zooms the camera; WASD + Q/E drive the ship.
 */

import * as THREE from 'three';

const CAMERA_SENSITIVITY = 0.003;
const MIN_CAMERA_DISTANCE = 5;
const MAX_CAMERA_DISTANCE = 50;
const DEFAULT_CAMERA_DISTANCE = 20;

/**
 * Create a ship mode controller
 * @param {Object} player - The player
 * @param {THREE.Camera} camera - The camera
 * @param {Object} world - The world object
 * @returns {Object} The ship mode controller
 */
export function createShipModeController(player, camera, world) {
  let active = false;

  // Orbit camera around ship (world space — independent of ship heading)
  let cameraYaw = 0;
  let cameraPitch = 0.35;
  let cameraDistance = DEFAULT_CAMERA_DISTANCE;

  function activate() {
    active = true;
    player.mode = 'ship';

    if (player.character?.mesh) {
      player.character.mesh.visible = false;
    }

    updateCamera();
  }

  function deactivate() {
    active = false;
    if (player.ship) {
      player.ship.controls = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false
      };
    }
  }

  function handleInput(keys) {
    if (!active || !player.ship) return;

    player.ship.controls = {
      forward: !!(keys.forward || keys.w),
      backward: !!(keys.backward || keys.s),
      left: !!(keys.left || keys.a),
      right: !!(keys.right || keys.d),
      up: !!keys.q,
      down: !!keys.e
    };
  }

  function handleMouseMove(deltaX, deltaY) {
    if (!active) return;

    cameraYaw -= deltaX * CAMERA_SENSITIVITY;
    cameraPitch -= deltaY * CAMERA_SENSITIVITY;
    cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraPitch));

    updateCamera();
  }

  function handleMouseWheel(delta) {
    if (!active) return;

    cameraDistance += delta * 0.02;
    cameraDistance = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, cameraDistance));

    updateCamera();
  }

  function updateCamera() {
    if (!active || !player.ship) return;

    const shipPosition = new THREE.Vector3(
      player.ship.position.x,
      player.ship.position.y,
      player.ship.position.z
    );

    const cosPitch = Math.cos(cameraPitch);
    const offset = new THREE.Vector3(
      Math.sin(cameraYaw) * cosPitch * cameraDistance,
      Math.sin(cameraPitch) * cameraDistance,
      Math.cos(cameraYaw) * cosPitch * cameraDistance
    );

    camera.position.copy(shipPosition).add(offset);
    camera.lookAt(shipPosition);
  }

  function update() {
    if (!active || !player.ship) return;
    updateCamera();
  }

  return {
    activate,
    deactivate,
    handleInput,
    handleMouseMove,
    handleMouseWheel,
    updateCamera,
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
