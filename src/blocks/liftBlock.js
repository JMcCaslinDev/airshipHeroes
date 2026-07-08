/**
 * Lift Block Class
 * 
 * Lift blocks provide lift to keep the ship airborne.
 * - Minimum 25% of total ship blocks must be Lift Blocks, or the ship sinks slowly.
 * - Flammable (like Minecraft wool), subject to fire spread mechanics.
 * - Base health: 1 unit.
 */

import * as THREE from 'three';
import BaseBlock from './baseBlock.js';

class LiftBlock extends BaseBlock {
  /**
   * Constructor for the LiftBlock class
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   */
  constructor(position, options = {}) {
    // Set health to 1 (base health for Lift Blocks)
    super(position, { ...options, health: 1 });
    
    this.type = 'lift';
    this.isFlammable = true; // Lift blocks are flammable
    this.liftForce = options.liftForce || 1; // Amount of lift this block provides
  }

  /**
   * Create the Three.js mesh for this block
   * @param {THREE.Scene} scene - The Three.js scene to add the mesh to
   * @param {THREE.TextureLoader} textureLoader - The texture loader to use
   */
  createMesh(scene, textureLoader) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Load textures for the lift block (light blue color)
    let material;
    
    if (textureLoader) {
      // Try to load texture if available
      try {
        const texture = textureLoader.load('/textures/lift_block.png');
        material = new THREE.MeshStandardMaterial({ map: texture });
      } catch (error) {
        console.warn('Failed to load lift block texture, using default color', error);
        material = new THREE.MeshStandardMaterial({ color: 0x87CEFA }); // Light sky blue
      }
    } else {
      // Use default color if no texture loader
      material = new THREE.MeshStandardMaterial({ color: 0x87CEFA }); // Light sky blue
    }
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Store a reference to the block instance on the mesh
    this.mesh.userData.block = this;
    
    scene.add(this.mesh);
  }

  /**
   * Add fire visual effect to the block
   * Overrides the base method to add lift-specific fire effects
   */
  addFireEffect() {
    super.addFireEffect();
    
    // Change the color to indicate burning
    if (this.mesh && this.mesh.material) {
      this.mesh.material.color.set(0xFF4500); // OrangeRed
      
      // Add particle effects for fire (to be implemented)
    }
  }

  /**
   * Calculate the lift force provided by this block
   * @param {Number} shipTotalBlocks - Total number of blocks in the ship
   * @returns {Number} - The lift force provided by this block
   */
  calculateLiftForce(shipTotalBlocks) {
    // If the block is burning, it provides less lift
    if (this.isBurning) {
      return this.liftForce * 0.5;
    }
    
    return this.liftForce;
  }

  /**
   * Update method called every frame
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    // If burning, update fire effects
    if (this.isBurning && this.mesh) {
      // Animate fire effect (to be implemented)
    }
  }
}

export default LiftBlock; 