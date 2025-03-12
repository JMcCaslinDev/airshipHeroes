/**
 * Ship Mode Module
 * 
 * Handles controls and camera for Ship Mode.
 */

import * as THREE from 'three';
import { updateShipPhysics, applyForce, applyTorque } from '../physics/shipPhysics.js';

/**
 * Create a ship mode controller
 * @param {Object} player - The player
 * @param {THREE.Camera} camera - The camera
 * @param {Object} world - The world object
 * @returns {Object} The ship mode controller
 */
export function createShipModeController(player, camera, world) {
  // Controller state
  let active = false;
  
  // Camera settings
  const cameraOffset = new THREE.Vector3(0, 10, 20);
  const cameraLookOffset = new THREE.Vector3(0, 0, -20);
  let cameraDistance = 20;
  
  /**
   * Activate ship mode
   */
  function activate() {
    active = true;
    player.mode = 'ship';
    
    // Hide character mesh
    if (player.character && player.character.mesh) {
      player.character.mesh.visible = false;
    }
    
    // Update camera
    updateCamera();
  }
  
  /**
   * Deactivate ship mode
   */
  function deactivate() {
    active = false;
  }
  
  /**
   * Handle keyboard input
   * @param {Object} keys - The key states
   */
  function handleInput(keys) {
    if (!active || !player.ship) return;
    
    // Set ship controls
    player.ship.controls = {
      forward: keys.forward || keys.w,
      backward: keys.backward || keys.s,
      left: keys.left || keys.a,
      right: keys.right || keys.d,
      up: keys.q,
      down: keys.e
    };
    
    // Fire cannons
    if (keys.fire) {
      fireCannons();
    }
    
    // Explicitly ignore inventory slot selection in ship mode
    // This ensures number keys don't affect inventory in ship mode
    // Reset any selected slot keys to prevent them from being processed when switching to player mode
    if (keys.slot1 || keys.slot2 || keys.slot3 || keys.slot4 || keys.slot5 || 
        keys.slot6 || keys.slot7 || keys.slot8 || keys.slot9) {
      // Do nothing in ship mode - inventory selection is disabled
      console.log("Ignoring inventory selection in ship mode");
    }
  }
  
  /**
   * Handle mouse movement
   * @param {number} deltaX - The change in X position
   * @param {number} deltaY - The change in Y position
   */
  function handleMouseMove(deltaX, deltaY) {
    if (!active) return;
    
    // Rotate ship based on mouse movement
    if (deltaX !== 0) {
      const rotationAmount = deltaX * 0.01;
      applyTorque(player.ship, -rotationAmount);
    }
  }
  
  /**
   * Handle mouse wheel
   * @param {number} delta - The wheel delta
   */
  function handleMouseWheel(delta) {
    if (!active) return;
    
    // Adjust camera distance
    cameraDistance += delta * 0.01;
    cameraDistance = Math.max(5, Math.min(20, cameraDistance));
    
    updateCamera();
  }
  
  /**
   * Update the camera position
   */
  function updateCamera() {
    if (!active || !player.ship) {
      console.log('Ship mode camera update skipped - not active or no ship');
      return;
    }
    
    try {
      // Calculate camera position
      const shipPosition = new THREE.Vector3(
        player.ship.position.x,
        player.ship.position.y,
        player.ship.position.z
      );
      
      console.log('Ship position:', shipPosition);
      
      // Calculate camera offset based on ship rotation
      const rotatedOffset = cameraOffset.clone();
      rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.ship.rotation);
      
      // Scale offset by camera distance
      rotatedOffset.normalize().multiplyScalar(cameraDistance);
      
      // Set camera position
      camera.position.copy(shipPosition).add(rotatedOffset);
      
      console.log('Camera position updated to:', camera.position);
      
      // Calculate look target
      const lookOffset = cameraLookOffset.clone();
      lookOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.ship.rotation);
      
      const lookTarget = shipPosition.clone().add(lookOffset);
      
      // Make camera look at target
      camera.lookAt(lookTarget);
      
      console.log('Camera looking at:', lookTarget);
      
      // Force camera to be above ground
      if (camera.position.y < 5) {
        camera.position.y = 5;
      }
    } catch (error) {
      console.error('Error updating camera in ship mode:', error);
      
      // Fallback camera position
      camera.position.set(0, 60, 20);
      camera.lookAt(0, 50, 0);
    }
  }
  
  /**
   * Fire cannons
   */
  function fireCannons() {
    if (!active || !player.ship) return;
    
    // Find cannon blocks
    const cannonBlocks = player.ship.blocks.filter(block => block.type === 'cannon');
    
    // Fire each cannon
    cannonBlocks.forEach(cannon => {
      // Calculate cannon position in world space
      const cannonPosition = new THREE.Vector3(
        player.ship.position.x + cannon.position.x,
        player.ship.position.y + cannon.position.y,
        player.ship.position.z + cannon.position.z
      );
      
      // Calculate firing direction based on ship rotation
      const firingDirection = new THREE.Vector3(0, 0, -1);
      firingDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.ship.rotation);
      
      // Create projectile
      createProjectile(cannonPosition, firingDirection);
    });
  }
  
  /**
   * Create a projectile
   * @param {THREE.Vector3} position - The starting position
   * @param {THREE.Vector3} direction - The direction
   */
  function createProjectile(position, direction) {
    // This would be implemented in a projectile system
    console.log('Fire projectile from', position, 'in direction', direction);
  }
  
  /**
   * Update the controller
   * @param {number} deltaTime - The time since the last update in seconds
   */
  function update(deltaTime) {
    if (!active || !player.ship) return;
    
    // Update ship physics
    updateShipPhysics(player.ship, world, deltaTime);
    
    // Update camera
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
    }
  };
}

/**
 * Create a third-person camera for ship mode
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} ship - The ship object
 * @returns {THREE.Camera} - The third-person camera
 */
export function createShipCamera(scene, ship) {
  // Create camera
  const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near plane
    1000 // Far plane
  );
  
  // Set initial position
  camera.position.set(0, 5, 10);
  
  // Add to scene
  scene.add(camera);
  
  return camera;
}

/**
 * Create a HUD for ship mode
 * @param {Object} player - The player object
 * @returns {Object} - The HUD object
 */
export function createShipHUD(player) {
  // Create HUD elements
  const hud = {
    player,
    elements: {},
    
    /**
     * Initialize the HUD
     */
    init() {
      // Create speed indicator
      this.elements.speed = document.createElement('div');
      this.elements.speed.id = 'ship-speed';
      this.elements.speed.style.position = 'absolute';
      this.elements.speed.style.bottom = '20px';
      this.elements.speed.style.left = '20px';
      this.elements.speed.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      this.elements.speed.style.color = 'white';
      this.elements.speed.style.padding = '10px';
      this.elements.speed.style.borderRadius = '5px';
      this.elements.speed.textContent = 'Speed: 0';
      
      // Create altitude indicator
      this.elements.altitude = document.createElement('div');
      this.elements.altitude.id = 'ship-altitude';
      this.elements.altitude.style.position = 'absolute';
      this.elements.altitude.style.bottom = '20px';
      this.elements.altitude.style.right = '20px';
      this.elements.altitude.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      this.elements.altitude.style.color = 'white';
      this.elements.altitude.style.padding = '10px';
      this.elements.altitude.style.borderRadius = '5px';
      this.elements.altitude.textContent = 'Altitude: 0';
      
      // Add elements to DOM
      document.body.appendChild(this.elements.speed);
      document.body.appendChild(this.elements.altitude);
      
      // Hide initially
      this.hide();
    },
    
    /**
     * Show the HUD
     */
    show() {
      for (const element of Object.values(this.elements)) {
        element.style.display = 'block';
      }
    },
    
    /**
     * Hide the HUD
     */
    hide() {
      for (const element of Object.values(this.elements)) {
        element.style.display = 'none';
      }
    },
    
    /**
     * Update the HUD
     */
    update() {
      if (!this.player || !this.player.ship) return;
      
      // Show HUD if in ship mode
      if (this.player.mode === 'ship') {
        this.show();
      } else {
        this.hide();
        return;
      }
      
      // Update speed indicator
      const speed = Math.sqrt(
        Math.pow(this.player.ship.velocity.x, 2) +
        Math.pow(this.player.ship.velocity.z, 2)
      ).toFixed(1);
      
      this.elements.speed.textContent = `Speed: ${speed}`;
      
      // Update altitude indicator
      const altitude = Math.floor(this.player.ship.position.y);
      this.elements.altitude.textContent = `Altitude: ${altitude}`;
    },
    
    /**
     * Destroy the HUD
     */
    destroy() {
      for (const element of Object.values(this.elements)) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    }
  };
  
  return hud;
} 