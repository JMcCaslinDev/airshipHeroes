/**
 * World Manager Module
 * 
 * Handles the persistent world blocks that are not part of ships.
 */

import * as THREE from 'three';

/**
 * Create a world manager
 * @returns {Object} - The world manager
 */
export function createWorldManager() {
  // World blocks
  const blocks = {};
  
  // World mesh group
  const group = new THREE.Group();
  group.name = 'World';
  
  // Block materials cache
  const materials = {};
  
  return {
    /**
     * Initialize the world manager
     * @param {THREE.Scene} scene - The Three.js scene
     */
    init(scene) {
      // Add world group to scene
      scene.add(group);
    },
    
    /**
     * Add a block to the world
     * @param {Object} position - The position of the block
     * @param {string} type - The type of block
     * @returns {THREE.Mesh} - The block mesh
     */
    addBlock(position, type) {
      // Create a unique key for this position
      const key = `${position.x},${position.y},${position.z}`;
      
      // Check if a block already exists at this position
      if (blocks[key]) {
        return blocks[key];
      }
      
      // Create block geometry
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      
      // Get or create material for this block type
      let material = materials[type];
      if (!material) {
        material = new THREE.MeshLambertMaterial({
          color: this.getBlockColor(type)
        });
        materials[type] = material;
      }
      
      // Create block mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type, isWorldBlock: true };
      
      // Add to group
      group.add(mesh);
      
      // Store block
      blocks[key] = mesh;
      
      return mesh;
    },
    
    /**
     * Remove a block from the world
     * @param {Object} position - The position of the block
     */
    removeBlock(position) {
      // Create a unique key for this position
      const key = `${position.x},${position.y},${position.z}`;
      
      // Check if a block exists at this position
      if (blocks[key]) {
        // Remove from group
        group.remove(blocks[key]);
        
        // Dispose of geometry
        blocks[key].geometry.dispose();
        
        // Remove from blocks object
        delete blocks[key];
      }
    },
    
    /**
     * Get a block at a position
     * @param {Object} position - The position of the block
     * @returns {THREE.Mesh|null} - The block mesh or null if not found
     */
    getBlock(position) {
      // Create a unique key for this position
      const key = `${position.x},${position.y},${position.z}`;
      
      // Return the block if it exists
      return blocks[key] || null;
    },
    
    /**
     * Get the color for a block type
     * @param {string} type - The type of block
     * @returns {number} - The color as a hex value
     */
    getBlockColor(type) {
      switch (type) {
        case 'wood':
          return 0x8B4513;
        case 'stone':
          return 0x808080;
        case 'metal':
          return 0xA9A9A9;
        case 'lift':
          return 0xFFD700;
        case 'cannon':
          return 0x696969;
        case 'steering':
          return 0x8B0000;
        default:
          return 0xFFFFFF;
      }
    },
    
    /**
     * Clear all blocks from the world
     */
    clear() {
      // Remove all blocks from group
      while (group.children.length > 0) {
        const mesh = group.children[0];
        group.remove(mesh);
        
        // Dispose of geometry
        mesh.geometry.dispose();
      }
      
      // Clear blocks object
      for (const key in blocks) {
        delete blocks[key];
      }
    },
    
    /**
     * Get all blocks in the world
     * @returns {Object} - The blocks object
     */
    getAllBlocks() {
      return { ...blocks };
    },
    
    /**
     * Get the world group
     * @returns {THREE.Group} - The world group
     */
    getGroup() {
      return group;
    }
  };
} 