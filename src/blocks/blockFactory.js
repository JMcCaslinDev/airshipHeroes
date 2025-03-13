/**
 * Block Factory
 * 
 * A factory for creating different types of blocks.
 * This centralizes block creation and makes it easier to add new block types.
 */

import * as THREE from 'three';

class BlockFactory {
  /**
   * Create a block of the specified type
   * @param {String} type - The type of block to create ('lift', 'wood', 'stone', 'cannon', 'control')
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   * @returns {Object} - The created block
   */
  static createBlock(type, position, options = {}) {
    // Normalize the type to lowercase
    const normalizedType = type.toLowerCase();
    
    // Create a generic block with the specified type
    const block = {
      type: normalizedType,
      position: { ...position },
      health: options.health || 100,
      rotation: options.rotation || 0,
      mesh: null,
      
      // Create mesh for the block
      createMesh(group, textureLoader) {
        // Create geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Get texture for the block type
        let texture;
        try {
          if (textureLoader && typeof textureLoader.get === 'function') {
            texture = textureLoader.get(this.type);
            console.log(`Successfully loaded texture for block type: ${this.type}`);
          } else {
            console.warn(`TextureLoader not available or missing get method for block type: ${this.type}`);
          }
        } catch (error) {
          console.error(`Failed to load texture for block type: ${this.type}`, error);
        }
        
        // Create material
        let material;
        if (texture) {
          material = new THREE.MeshStandardMaterial({ 
            map: texture,
            // Add these properties to improve texture appearance
            roughness: 0.7,
            metalness: 0.2
          });
        } else {
          // Use default color if texture loading failed
          const color = this.getDefaultColor();
          console.warn(`Using default color ${color.toString(16)} for block type: ${this.type}`);
          material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7,
            metalness: 0.2
          });
        }
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Set position
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        
        // Set rotation if specified
        if (this.rotation) {
          this.mesh.rotation.y = this.rotation;
        }
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Set userData to reference this block
        this.mesh.userData.block = this;
        this.mesh.userData.isBlock = true;
        this.mesh.userData.type = this.type;
        this.mesh.userData.gridPosition = { ...this.position };
        
        // Add to group
        if (group) {
          group.add(this.mesh);
          
          // Force update the world matrix to ensure correct positioning
          this.mesh.updateMatrixWorld(true);
          
          console.log(`Added mesh for ${this.type} block to group at position:`, this.position);
        } else {
          console.error("No group provided to add mesh to");
        }
      },
      
      // Get default color for the block type
      getDefaultColor() {
        switch (this.type) {
          case 'wood': return 0x8B4513;
          case 'stone': return 0x808080;
          case 'lift': return 0xFFD700;
          case 'cannon': return 0x696969;
          case 'control': return 0x8B0000;
          default: return 0xAAAAAA;
        }
      },
      
      // Get the world position of this block
      getWorldPosition(ship) {
        if (!ship) return { ...this.position };
        
        // Use ship's transformation function if available
        if (ship.localToWorldPosition) {
          return ship.localToWorldPosition(this.position);
        }
        
        // Fallback to simple addition if ship doesn't have transformation function
        return {
          x: ship.position.x + this.position.x,
          y: ship.position.y + this.position.y,
          z: ship.position.z + this.position.z
        };
      },
      
      // Get the collision box for this block
      getCollisionBox(ship) {
        const worldPos = this.getWorldPosition(ship);
        const box = new THREE.Box3();
        
        box.min.set(
          worldPos.x - 0.5,
          worldPos.y - 0.5,
          worldPos.z - 0.5
        );
        
        box.max.set(
          worldPos.x + 0.5,
          worldPos.y + 0.5,
          worldPos.z + 0.5
        );
        
        return box;
      }
    };
    
    return block;
  }

  /**
   * Create blocks from a ship definition
   * @param {Object} shipDefinition - The ship definition object
   * @returns {Array} - Array of created blocks
   */
  static createBlocksFromShipDefinition(shipDefinition) {
    const blocks = [];
    
    if (!shipDefinition || !shipDefinition.blocks || !Array.isArray(shipDefinition.blocks)) {
      console.error('Invalid ship definition');
      return blocks;
    }
    
    // Create each block from the definition
    for (const blockDef of shipDefinition.blocks) {
      // Handle both formats: {type, x, y, z} and {type, position: {x, y, z}}
      let position;
      let options = { ...blockDef };
      
      if (blockDef.position) {
        // Format: {type, position: {x, y, z}}
        position = { ...blockDef.position };
        delete options.position;
      } else if (blockDef.x !== undefined && blockDef.y !== undefined && blockDef.z !== undefined) {
        // Format: {type, x, y, z}
        position = { x: blockDef.x, y: blockDef.y, z: blockDef.z };
        delete options.x;
        delete options.y;
        delete options.z;
      } else {
        console.warn('Skipping invalid block definition', blockDef);
        continue;
      }
      
      const { type } = blockDef;
      
      if (!type || !position) {
        console.warn('Skipping invalid block definition', blockDef);
        continue;
      }
      
      const block = this.createBlock(type, position, options);
      if (block) {
        blocks.push(block);
      }
    }
    
    return blocks;
  }

  /**
   * Count the number of blocks of each type in an array of blocks
   * @param {Array} blocks - Array of blocks
   * @returns {Object} - Object with counts for each block type
   */
  static countBlockTypes(blocks) {
    const counts = {
      lift: 0,
      wood: 0,
      stone: 0,
      cannon: 0,
      control: 0,
      total: blocks.length
    };
    
    for (const block of blocks) {
      if (counts[block.type] !== undefined) {
        counts[block.type]++;
      }
    }
    
    return counts;
  }

  /**
   * Check if a ship has enough lift blocks (at least 30% of total)
   * @param {Array} blocks - Array of blocks
   * @returns {Boolean} - Whether the ship has enough lift blocks
   */
  static hasEnoughLift(blocks) {
    const counts = this.countBlockTypes(blocks);
    return counts.lift >= counts.total * 0.3;
  }
}

export default BlockFactory; 