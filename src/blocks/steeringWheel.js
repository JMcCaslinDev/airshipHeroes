/**
 * Steering Wheel Block Class
 * 
 * Central, immovable block that the ship is built around.
 * - Indestructible (infinite health).
 * - Camera anchor point in Ship Mode.
 */

import * as THREE from 'three';
import BaseBlock from './baseBlock.js';

class SteeringWheel extends BaseBlock {
  /**
   * Constructor for the SteeringWheel class
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   */
  constructor(position, options = {}) {
    // Set health to Infinity (indestructible)
    super(position, { ...options, health: Infinity });
    
    this.type = 'steeringWheel';
    this.isFlammable = false; // Steering wheel is not flammable
    this.rotation = options.rotation || 0; // Current rotation of the wheel
    this.shipRotation = options.shipRotation || 0; // Current rotation of the ship
  }

  /**
   * Create the Three.js mesh for this block
   * @param {THREE.Scene} scene - The Three.js scene to add the mesh to
   * @param {THREE.TextureLoader} textureLoader - The texture loader to use
   */
  createMesh(scene, textureLoader) {
    // Create a group to hold the steering wheel parts
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    
    // Create the base of the steering wheel (a cube)
    const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
    let baseMaterial;
    
    if (textureLoader) {
      // Try to load texture if available
      try {
        const texture = textureLoader.load('/textures/steering_wheel_block.png');
        baseMaterial = new THREE.MeshStandardMaterial({ 
          map: texture,
          metalness: 0.5,
          roughness: 0.5
        });
      } catch (error) {
        console.warn('Failed to load steering wheel texture, using default color', error);
        baseMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x8B4513, // SaddleBrown (wooden color)
          metalness: 0.1,
          roughness: 0.8
        });
      }
    } else {
      // Use default color if no texture loader
      baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // SaddleBrown (wooden color)
        metalness: 0.1,
        roughness: 0.8
      });
    }
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    
    // Create the actual steering wheel (a torus)
    const wheelGeometry = new THREE.TorusGeometry(0.4, 0.05, 8, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513, // SaddleBrown (wooden color)
      metalness: 0.1,
      roughness: 0.8
    });
    
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(0, 0.5, 0); // Position on top of the base
    wheel.rotation.x = Math.PI / 2; // Rotate to be horizontal
    
    // Create spokes for the wheel
    const spokeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
    
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(spokeGeometry, wheelMaterial);
      spoke.position.set(0, 0.5, 0);
      spoke.rotation.x = Math.PI / 2;
      spoke.rotation.z = (Math.PI / 4) * i;
      this.mesh.add(spoke);
    }
    
    // Add the parts to the group
    this.mesh.add(base);
    this.mesh.add(wheel);
    
    // Create a separate object for the wheel that can rotate
    this.wheelMesh = wheel;
    
    // Store a reference to the block instance on the mesh
    this.mesh.userData.block = this;
    
    scene.add(this.mesh);
  }

  /**
   * Take damage - overridden to make the steering wheel indestructible
   * @param {Number} amount - The amount of damage to take
   * @returns {Boolean} - Always false (cannot be destroyed)
   */
  takeDamage(amount) {
    // Steering wheel is indestructible
    return false;
  }

  /**
   * Set the block on fire - overridden to make the steering wheel non-flammable
   * @returns {Boolean} - Always false (cannot catch fire)
   */
  setOnFire() {
    // Steering wheel cannot catch fire
    return false;
  }

  /**
   * Rotate the steering wheel
   * @param {Number} amount - The amount to rotate in radians
   */
  rotate(amount) {
    this.rotation += amount;
    
    // Update the visual rotation of the wheel
    if (this.wheelMesh) {
      this.wheelMesh.rotation.z = this.rotation;
    }
  }

  /**
   * Get the camera position for Ship Mode
   * @param {Number} distance - Distance behind the steering wheel
   * @param {Number} height - Height above the steering wheel
   * @returns {Object} - The camera position {x, y, z}
   */
  getCameraPosition(distance = 10, height = 5) {
    // Calculate position based on ship rotation
    return {
      x: this.position.x - Math.sin(this.shipRotation) * distance,
      y: this.position.y + height,
      z: this.position.z - Math.cos(this.shipRotation) * distance
    };
  }

  /**
   * Get the camera target for Ship Mode (looking at the steering wheel)
   * @returns {Object} - The camera target position {x, y, z}
   */
  getCameraTarget() {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z
    };
  }

  /**
   * Update method called every frame
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    // Steering wheel specific update logic (if needed)
  }
}

export default SteeringWheel; 