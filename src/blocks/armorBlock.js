/**
 * Armor Block Class
 * 
 * Armor blocks protect Lift Blocks when surrounding them.
 * - Non-flammable.
 * - Health: 4x that of Lift Blocks (4 units).
 */

import * as THREE from 'three';
import BaseBlock from './baseBlock.js';

class ArmorBlock extends BaseBlock {
  /**
   * Constructor for the ArmorBlock class
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   */
  constructor(position, options = {}) {
    // Set health to 4 (4x the base health of Lift Blocks)
    super(position, { ...options, health: 4 });
    
    this.type = 'armor';
    this.isFlammable = false; // Armor blocks are not flammable
  }

  /**
   * Create the Three.js mesh for this block
   * @param {THREE.Scene} scene - The Three.js scene to add the mesh to
   * @param {THREE.TextureLoader} textureLoader - The texture loader to use
   */
  createMesh(scene, textureLoader) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Load textures for the armor block (gray metal color)
    let material;
    
    if (textureLoader) {
      // Try to load texture if available
      try {
        const texture = textureLoader.load('/textures/armor_block.png');
        material = new THREE.MeshStandardMaterial({ 
          map: texture,
          metalness: 0.7,
          roughness: 0.3
        });
      } catch (error) {
        console.warn('Failed to load armor block texture, using default color', error);
        material = new THREE.MeshStandardMaterial({ 
          color: 0x808080, // Gray
          metalness: 0.7,
          roughness: 0.3
        });
      }
    } else {
      // Use default color if no texture loader
      material = new THREE.MeshStandardMaterial({ 
        color: 0x808080, // Gray
        metalness: 0.7,
        roughness: 0.3
      });
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
   * Update the block's appearance based on damage
   * Overrides the base method to show armor-specific damage
   */
  updateDamageAppearance() {
    if (!this.mesh || !this.mesh.material) return;
    
    // Calculate damage percentage
    const damagePercent = 1 - (this.health / this.maxHealth);
    
    // Darken and add "dents" (roughness) based on damage
    this.mesh.material.color.setRGB(
      0.5 - damagePercent * 0.3,
      0.5 - damagePercent * 0.3,
      0.5 - damagePercent * 0.3
    );
    
    // Increase roughness as damage increases
    this.mesh.material.roughness = 0.3 + damagePercent * 0.5;
  }

  /**
   * Set the block on fire - armor blocks cannot catch fire
   * @returns {Boolean} - Always false for armor blocks
   */
  setOnFire() {
    // Armor blocks cannot catch fire
    return false;
  }

  /**
   * Update method called every frame
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    // Armor-specific update logic (if needed)
  }
}

export default ArmorBlock; 