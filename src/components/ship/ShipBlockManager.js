/**
 * ShipBlockManager Class
 * 
 * Manages blocks within a ship, including adding, removing, and querying blocks.
 */

import * as THREE from 'three';
import BlockFactory from '../../blocks/blockFactory.js';
import { recalculateShipHealth, updateSinkingState } from '../../combat/shipCombat.js';
import {
  canBreakControlBlock,
  isControlBlockType,
  syncControlBlocks
} from '../../blocks/controlBlockRules.js';

class ShipBlockManager {
  /**
   * Constructor for the ShipBlockManager class
   * @param {Ship} ship - The ship this manager belongs to
   */
  constructor(ship) {
    this.ship = ship;
    this.blocks = []; // Array of all blocks in the ship
  }

  /**
   * Add a block to the ship
   * @param {Object} block - The block to add
   * @param {THREE.TextureLoader} textureLoader - Texture loader for block textures
   */
  addBlock(block, textureLoader) {
    console.log(`Adding block of type ${block.type} at position:`, block.position);
    
    // Add to blocks array
    this.blocks.push(block);
    
    // Ensure the ship group exists
    if (!this.ship.group) {
      console.error("Ship group does not exist, cannot add block mesh");
      return block;
    }
    
    // Ensure the ship group is in a scene
    if (!this.ship.group.parent && window.renderer && window.renderer.scene) {
      console.log("Ship group is not in scene, adding it now");
      window.renderer.scene.add(this.ship.group);
    }
    
    // Create mesh and add to the group
    try {
      if (block.createMesh) {
        // Check if the ship group is in the scene
        if (!this.ship.group.parent) {
          console.warn("Ship group is not in any scene, block mesh may not be visible");
        }
        
        // Create the mesh
        block.createMesh(this.ship.group, textureLoader);
        console.log(`Created mesh for ${block.type} block`);
        
        // Ensure the mesh is visible
        if (block.mesh) {
          block.mesh.visible = true;
          
          // Ensure the mesh is a child of the ship group
          if (block.mesh.parent !== this.ship.group) {
            console.warn(`Block mesh parent is not ship group, fixing...`);
            if (block.mesh.parent) {
              block.mesh.parent.remove(block.mesh);
            }
            this.ship.group.add(block.mesh);
          }
          
          // Force update the world matrix
          block.mesh.updateMatrixWorld(true);
          
          // Log mesh position
          console.log(`Block mesh position: ${JSON.stringify({
            x: block.mesh.position.x,
            y: block.mesh.position.y,
            z: block.mesh.position.z
          })}`);
        } else {
          console.warn(`Failed to create mesh for ${block.type} block`);
        }
      } else {
        console.error(`Block of type ${block.type} does not have createMesh method`);
      }
    } catch (error) {
      console.error(`Error creating mesh for ${block.type} block:`, error);
    }
    
    if (isControlBlockType(block.type)) {
      const extras = syncControlBlocks(this.ship);
      if (extras > 0) {
        console.warn(`Ship has ${extras + 1} control blocks — extras are red and removable`);
      }
    }

    // Hide debug placeholder when the ship has real blocks
    if (this.ship.debugMesh && this.blocks.length > 0) {
      this.ship.debugMesh.visible = false;
    }

    // Check lift / sinking after block add
    recalculateShipHealth(this.ship);
    this.checkLift();
    
    // Return the block for chaining
    return block;
  }

  /**
   * Remove a block from the ship
   * @param {Object} position - The position of the block to remove
   * @returns {boolean} - Whether the block was removed
   */
  removeBlock(position) {
    console.log(`Attempting to remove block at position: ${JSON.stringify(position)}`);
    
    // Find the block at the given position
    const blockIndex = this.blocks.findIndex(block => 
      block.position.x === position.x &&
      block.position.y === position.y &&
      block.position.z === position.z
    );
    
    if (blockIndex === -1) {
      console.warn(`No block found at position ${JSON.stringify(position)}`);
      return false;
    }
    
    const block = this.blocks[blockIndex];

    // Primary control is protected; extras (red) can be removed
    if (isControlBlockType(block.type) && !canBreakControlBlock(block)) {
      console.warn('Cannot remove primary steering wheel — remove extra (red) controls first');
      return false;
    }
    
    // Remove the block's mesh from the group
    if (block.mesh) {
      if (block.mesh.parent) {
        block.mesh.parent.remove(block.mesh);
      }
      
      // Dispose of geometry and material to free memory
      if (block.mesh.geometry) {
        block.mesh.geometry.dispose();
      }

      if (block.type === 'engine') {
        block.disposeEngineMaterials?.();
      } else if (block.mesh.material) {
        if (Array.isArray(block.mesh.material)) {
          block.mesh.material.forEach((material) => material.dispose());
        } else {
          block.mesh.material.dispose();
        }
      }
    }

    block.disposeFlame?.();
    
    // Remove the block from the blocks array
    this.blocks.splice(blockIndex, 1);

    if (isControlBlockType(block.type)) {
      syncControlBlocks(this.ship);
    }
    
    console.log(`Block removed from position ${JSON.stringify(position)}`);
    
    recalculateShipHealth(this.ship);
    this.checkLift();
    
    return true;
  }

  /**
   * Check if the ship has enough lift blocks (at least 25% of total)
   */
  checkLift() {
    const prevState = this.ship.sinkState;
    updateSinkingState(this.ship);
    if (this.ship.isSinking && prevState === 'none') {
      this.ship.sinkingStartTime = performance.now();
    } else if (!this.ship.isSinking) {
      this.ship.stopSinking();
    }
  }

  /**
   * Find a block at the specified local position
   * @param {Object} localPos - The position in ship-local coordinates {x, y, z}
   * @returns {Object|null} - The block at the position, or null if no block exists
   */
  getBlockAtLocalPosition(localPos) {
    // Round positions to ensure integer grid coordinates
    const gridPos = {
      x: Math.round(localPos.x),
      y: Math.round(localPos.y),
      z: Math.round(localPos.z)
    };
    
    return this.blocks.find(block => 
      Math.round(block.position.x) === gridPos.x &&
      Math.round(block.position.y) === gridPos.y &&
      Math.round(block.position.z) === gridPos.z
    );
  }

  /**
   * Find a block at the specified world position
   * @param {Object} worldPos - The position in world coordinates {x, y, z}
   * @returns {Object|null} - The block at the position, or null if no block exists
   */
  getBlockAtWorldPosition(worldPos) {
    const localPos = this.ship.transform.worldToLocalPosition(worldPos);
    return this.getBlockAtLocalPosition(localPos);
  }

  /**
   * Check if a block exists at the specified local position
   * @param {Object} localPos - The position in ship-local coordinates {x, y, z}
   * @returns {Boolean} - Whether a block exists at the position
   */
  hasBlockAtLocalPosition(localPos) {
    return this.getBlockAtLocalPosition(localPos) !== undefined;
  }

  /**
   * Check if a block exists at the specified world position
   * @param {Object} worldPos - The position in world coordinates {x, y, z}
   * @returns {Boolean} - Whether a block exists at the position
   */
  hasBlockAtWorldPosition(worldPos) {
    return this.getBlockAtWorldPosition(worldPos) !== undefined;
  }

  /**
   * Get the position of a block in world space
   * @param {Object} block - The block to get the position of
   * @returns {Object} - The world position {x, y, z}
   */
  getBlockWorldPosition(block) {
    // If the block has a mesh, use its world position for accuracy
    if (block.mesh) {
      // Ensure the matrix is up to date
      block.mesh.updateMatrixWorld(true);
      
      // Get the world position from the mesh
      const worldPosition = new THREE.Vector3();
      worldPosition.setFromMatrixPosition(block.mesh.matrixWorld);
      
      return {
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z
      };
    }
    
    // Fallback to mathematical transformation if no mesh is available
    return this.ship.transform.localToWorldPosition(block.position);
  }

  /**
   * Get the total number of blocks in the ship
   * @returns {Number} - The total number of blocks
   */
  getBlockCount() {
    return this.blocks.length;
  }

  /**
   * Get the number of blocks of a specific type
   * @param {String} type - The type of block to count
   * @returns {Number} - The number of blocks of the specified type
   */
  getBlockCountByType(type) {
    return this.blocks.filter(block => block.type === type).length;
  }

  /**
   * Break a block at the given position
   * @param {Object} position - The position of the block to break
   * @param {Object} options - Additional options
   * @returns {Object|null} - The broken block or null if no block was broken
   */
  breakBlock(position, options = {}) {
    console.log(`Breaking block at position: ${JSON.stringify(position)}`);
    
    // Find the block at the given position
    const block = this.blocks.find(block => 
      block.position.x === position.x &&
      block.position.y === position.y &&
      block.position.z === position.z
    );
    
    if (!block) {
      console.warn(`No block found at position ${JSON.stringify(position)}`);
      return null;
    }
    
    // Primary control protected; red extras can be broken
    if (!canBreakControlBlock(block, options)) {
      console.warn('Cannot break primary steering wheel');
      return null;
    }
    
    // Remove the block
    const removed = this.removeBlock(position);
    
    if (!removed) {
      console.warn(`Failed to remove block at position ${JSON.stringify(position)}`);
      return null;
    }
    
    // Create a drop if specified
    if (options.createDrop && typeof options.createDrop === 'function') {
      options.createDrop(block);
    }
    
    return block;
  }

  /**
   * Clear all blocks from the ship
   */
  clearBlocks() {
    // Remove all block meshes from the group
    for (const block of this.blocks) {
      block.disposeFlame?.();
      if (block.mesh && block.mesh.parent) {
        block.mesh.parent.remove(block.mesh);
        
        // Dispose of geometry and material to free memory
        if (block.mesh.geometry) {
          block.mesh.geometry.dispose();
        }

        if (block.type === 'engine') {
          block.disposeEngineMaterials?.();
        } else if (block.mesh.material) {
          if (Array.isArray(block.mesh.material)) {
            block.mesh.material.forEach((material) => material.dispose());
          } else {
            block.mesh.material.dispose();
          }
        }
      }
    }
    
    // Clear the blocks array
    this.blocks = [];
    
    // Reset steering wheel reference
    this.ship.steeringWheel = null;
  }
}

export default ShipBlockManager; 