/**
 * Engine Block Class
 * 
 * Engine blocks enable movement (controlled in Ship Mode).
 * - Health: 3x that of Armor Blocks (12 units).
 */

import * as THREE from 'three';
import BaseBlock from './baseBlock.js';

class EngineBlock extends BaseBlock {
  /**
   * Constructor for the EngineBlock class
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   */
  constructor(position, options = {}) {
    // Set health to 12 (3x the health of Armor Blocks)
    super(position, { ...options, health: 12 });
    
    this.type = 'engine';
    this.isFlammable = false; // Engine blocks are not flammable
    this.isActive = false; // Whether the engine is currently active
    this.thrustPower = options.thrustPower || 1; // Amount of thrust this engine provides
    this.direction = options.direction || { x: 0, y: 0, z: -1 }; // Default direction (forward)
    
    // Particle system for engine thrust
    this.thrustParticles = null;
  }

  /**
   * Create the Three.js mesh for this block
   * @param {THREE.Scene} scene - The Three.js scene to add the mesh to
   * @param {THREE.TextureLoader} textureLoader - The texture loader to use
   */
  createMesh(scene, textureLoader) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Load textures for the engine block (dark metal with red accents)
    let material;
    
    if (textureLoader) {
      // Try to load texture if available
      try {
        const texture = textureLoader.load('/textures/engine_block.png');
        material = new THREE.MeshStandardMaterial({ 
          map: texture,
          metalness: 0.8,
          roughness: 0.2
        });
      } catch (error) {
        console.warn('Failed to load engine block texture, using default color', error);
        material = new THREE.MeshStandardMaterial({ 
          color: 0x444444, // Dark gray
          metalness: 0.8,
          roughness: 0.2
        });
      }
    } else {
      // Use default color if no texture loader
      material = new THREE.MeshStandardMaterial({ 
        color: 0x444444, // Dark gray
        metalness: 0.8,
        roughness: 0.2
      });
    }
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Add a small cone to indicate thrust direction
    const coneGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
    const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    
    // Position the cone based on the engine direction
    cone.position.set(
      this.direction.x * 0.7,
      this.direction.y * 0.7,
      this.direction.z * 0.7
    );
    
    // Rotate the cone to point in the direction of thrust
    if (this.direction.z === -1) {
      // Forward
      cone.rotation.x = Math.PI;
    } else if (this.direction.z === 1) {
      // Backward
      // No rotation needed, default cone points up
    } else if (this.direction.x === 1) {
      // Right
      cone.rotation.z = -Math.PI / 2;
    } else if (this.direction.x === -1) {
      // Left
      cone.rotation.z = Math.PI / 2;
    }
    
    this.mesh.add(cone);
    
    // Store a reference to the block instance on the mesh
    this.mesh.userData.block = this;
    
    scene.add(this.mesh);
    
    // Create thrust particles (to be shown when engine is active)
    this.createThrustParticles(scene);
  }

  /**
   * Create particle system for engine thrust
   * @param {THREE.Scene} scene - The Three.js scene to add the particles to
   */
  createThrustParticles(scene) {
    // This is a placeholder for the actual particle system implementation
    // In a full implementation, we would use THREE.Points with custom shaders
    
    // Create a simple placeholder for now
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6600, 
      transparent: true,
      opacity: 0.7
    });
    
    this.thrustParticles = new THREE.Mesh(particleGeometry, particleMaterial);
    this.thrustParticles.position.set(
      this.position.x + this.direction.x * 1.2,
      this.position.y + this.direction.y * 1.2,
      this.position.z + this.direction.z * 1.2
    );
    
    // Hide particles initially
    this.thrustParticles.visible = false;
    
    scene.add(this.thrustParticles);
  }

  /**
   * Activate the engine
   * @param {Boolean} active - Whether to activate or deactivate the engine
   */
  setActive(active) {
    this.isActive = active;
    
    // Show/hide thrust particles
    if (this.thrustParticles) {
      this.thrustParticles.visible = active;
    }
  }

  /**
   * Calculate the thrust force provided by this engine
   * @returns {Object} - The thrust vector {x, y, z}
   */
  calculateThrust() {
    if (!this.isActive) {
      return { x: 0, y: 0, z: 0 };
    }
    
    return {
      x: this.direction.x * this.thrustPower,
      y: this.direction.y * this.thrustPower,
      z: this.direction.z * this.thrustPower
    };
  }

  /**
   * Update method called every frame
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    // Update thrust particles if engine is active
    if (this.isActive && this.thrustParticles) {
      // Animate particles (in a full implementation, this would be more complex)
      this.thrustParticles.rotation.y += deltaTime * 5;
      
      // Pulse the size
      const scale = 1 + Math.sin(Date.now() * 0.01) * 0.2;
      this.thrustParticles.scale.set(scale, scale, scale);
    }
  }
}

export default EngineBlock; 