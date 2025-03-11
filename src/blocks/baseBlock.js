/**
 * Base Block Class
 * 
 * This is the parent class for all block types in the game.
 * It defines common properties and methods that all blocks share.
 */

import * as THREE from 'three';

class BaseBlock {
  /**
   * Constructor for the BaseBlock class
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   */
  constructor(position, options = {}) {
    this.position = position;
    this.health = options.health || 1;
    this.maxHealth = this.health;
    this.mesh = null;
    this.type = 'base';
    this.isFlammable = false;
    this.isBurning = false;
    this.isDestroyed = false;
  }

  /**
   * Create the Three.js mesh for this block
   * @param {THREE.Scene} scene - The Three.js scene to add the mesh to
   * @param {THREE.TextureLoader} textureLoader - The texture loader to use
   */
  createMesh(scene, textureLoader) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffffff 
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Store a reference to the block instance on the mesh
    this.mesh.userData.block = this;
    
    scene.add(this.mesh);
  }

  /**
   * Take damage
   * @param {Number} amount - The amount of damage to take
   * @returns {Boolean} - Whether the block was destroyed
   */
  takeDamage(amount) {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    
    // Update appearance based on damage
    this.updateDamageAppearance();
    return false;
  }

  /**
   * Update the block's appearance based on damage
   */
  updateDamageAppearance() {
    if (!this.mesh) return;
    
    // Calculate damage percentage
    const damagePercent = 1 - (this.health / this.maxHealth);
    
    // Darken the block based on damage
    if (this.mesh.material) {
      this.mesh.material.color.setRGB(
        1 - damagePercent * 0.5,
        1 - damagePercent * 0.5,
        1 - damagePercent * 0.5
      );
    }
  }

  /**
   * Destroy the block
   */
  destroy() {
    this.isDestroyed = true;
    
    // Remove from scene if mesh exists
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }

  /**
   * Set the block on fire (if flammable)
   * @returns {Boolean} - Whether the block caught fire
   */
  setOnFire() {
    if (this.isFlammable && !this.isBurning) {
      this.isBurning = true;
      
      // Add fire effect (to be implemented)
      this.addFireEffect();
      
      // Start taking damage over time
      this.startBurningDamage();
      
      return true;
    }
    
    return false;
  }

  /**
   * Add fire visual effect to the block
   */
  addFireEffect() {
    // To be implemented with particle effects
    console.log(`Block at ${this.position.x}, ${this.position.y}, ${this.position.z} is on fire!`);
  }

  /**
   * Start taking damage over time due to burning
   */
  startBurningDamage() {
    // Damage the block every second while burning
    const burnInterval = setInterval(() => {
      if (!this.isBurning || this.isDestroyed) {
        clearInterval(burnInterval);
        return;
      }
      
      this.takeDamage(0.5);
    }, 1000);
  }

  /**
   * Update method called every frame
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    // Base update logic
    if (this.isBurning) {
      // Update fire effects
    }
  }
}

export default BaseBlock; 