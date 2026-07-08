/**
 * BlockInteractions Class
 * 
 * Handles player interactions with blocks, including:
 * - Breaking blocks
 * - Placing blocks
 * - Raycasting for block targeting
 */

import * as THREE from 'three';
import BlockFactory from '../../../blocks/blockFactory.js';

class BlockInteractions {
  /**
   * Constructor for the BlockInteractions class
   * @param {Object} player - The player instance
   */
  constructor(player) {
    this.player = player;
    this.maxPlaceDistance = 5; // Maximum distance to place blocks
  }

  /**
   * Break a block in the world
   */
  breakBlock() {
    console.log("Breaking block...");
    
    // Only allow block breaking in player mode
    if (this.player.mode !== 'player') {
      console.log("Cannot break blocks in ship mode");
      return;
    }
    
    const { eyePosition, lookDirection } = this.getEyePositionAndDirection();
    
    // Cast ray to find block to break
    const raycaster = new THREE.Raycaster(eyePosition, lookDirection);
    raycaster.far = this.maxPlaceDistance;
    
    // Check for intersection with the ship
    if (this.player.ship && this.player.ship.blockManager && this.player.ship.blockManager.blocks.length > 0) {
      // Get all block meshes from the ship
      const blockMeshes = this.getBlockMeshes();
      
      // Check for intersection with block meshes
      const intersects = raycaster.intersectObjects(blockMeshes, false);
      
      if (intersects.length > 0) {
        // Get the first intersection
        const intersection = intersects[0];
        
        // Handle block breaking
        this.handleBlockBreaking(intersection);
        
        // Validate ship blocks after breaking
        this.player.validateShipBlocks();
        
        // Save ship to storage
        this.saveShipToStorage();
        
        return true;
      }
    }
    
    console.log("No block found to break");
    return false;
  }

  /**
   * Place a block in the world
   */
  placeBlock() {
    console.log("Placing block...");
    
    // Only allow block placement in player mode
    if (this.player.mode !== 'player') {
      console.log("Cannot place blocks in ship mode");
      return;
    }
    
    const { eyePosition, lookDirection } = this.getEyePositionAndDirection();
    
    const raycaster = new THREE.Raycaster(eyePosition, lookDirection);
    raycaster.far = this.maxPlaceDistance;
    
    if (!this.player.ship?.blockManager?.blocks.length) {
      console.log('Cannot place block: ship has no blocks to attach to');
      return false;
    }

    const placed = this.handleBlockPlacementWithExistingShip(raycaster);
    
    if (placed) {
      this.player.validateShipBlocks();
      this.saveShipToStorage();
      return true;
    }
    
    console.log("Could not place block");
    return false;
  }

  /**
   * Get the player's eye position and look direction
   * @returns {Object} - Object containing eyePosition and lookDirection
   */
  getEyePositionAndDirection() {
    // Get eye position (camera position)
    const eyePosition = new THREE.Vector3(
      this.player.character.position.x,
      this.player.character.position.y + 1.6, // Eye level
      this.player.character.position.z
    );
    
    // Get look direction
    const lookDirection = new THREE.Vector3(0, 0, -1);
    lookDirection.applyEuler(new THREE.Euler(
      this.player.cameraRotation.x,
      this.player.cameraRotation.y,
      0,
      'YXZ'
    ));
    lookDirection.normalize();
    
    return { eyePosition, lookDirection };
  }

  /**
   * Get all block meshes from the ship
   * @returns {Array} Array of THREE.Mesh objects
   */
  getBlockMeshes() {
    if (!this.player.ship || !this.player.ship.blockManager) {
      return [];
    }
    
    // Filter out blocks without meshes
    return this.player.ship.blockManager.blocks
      .filter(block => block.mesh)
      .map(block => block.mesh);
  }

  /**
   * Handle the actual block breaking logic
   * @param {Object} intersection - The intersection data
   */
  handleBlockBreaking(intersection) {
    // Get the block from the mesh
    const mesh = intersection.object;
    
    // First try to get the block from the mesh's userData
    let block = mesh.userData.block;
    
    if (block) {
      console.log(`Found block of type: ${block.type} at position:`, block.position);
      
      // Store block type before removal
      const blockType = block.type;
      
      // Try to remove the block from the ship
      const removed = this.player.ship.removeBlock(block.position);
      
      if (removed) {
        console.log("Block successfully removed from ship");
        
        // Add to inventory
        this.player.inventory.addItem({ type: blockType });
        
        // Save ship to localStorage if shipStorage is available
        this.saveShipToStorage();
      }
    } else {
      console.error("No block data found on mesh");
      
      // Try to find the block by world position
      const intersectionPoint = intersection.point.clone();
      
      // Convert the intersection point to ship-local coordinates
      const localPos = this.player.ship.worldToLocalPosition({
        x: intersectionPoint.x,
        y: intersectionPoint.y,
        z: intersectionPoint.z
      });
      
      // Find the block at this position
      const blockAtPosition = this.player.ship.getBlockAtLocalPosition(localPos);
      
      if (blockAtPosition) {
        console.log(`Found block by position: ${blockAtPosition.type} at local position:`, blockAtPosition.position);
        
        // Store block type before removal
        const blockType = blockAtPosition.type;
        
        // Try to remove the block from the ship
        const removed = this.player.ship.removeBlock(blockAtPosition.position);
        
        if (removed) {
          console.log("Block successfully removed by position");
          
          // Add to inventory
          this.player.inventory.addItem({ type: blockType });
          
          // Save ship and inventory
          this.saveShipToStorage();
        } else {
          console.log("Block could not be removed (might be a critical block)");
        }
      } else {
        console.error("Could not find block at local position:", localPos);
        
        // As a last resort, remove the mesh from the scene
        if (mesh.parent) {
          mesh.parent.remove(mesh);
          console.log("Removed orphaned mesh from scene");
        }
      }
    }
  }

  /**
   * Place adjacent to a raycast hit on an existing ship block face.
   * @param {THREE.Raycaster} raycaster
   * @returns {boolean}
   */
  handleBlockPlacementWithExistingShip(raycaster) {
    const blockMeshes = this.getBlockMeshes();
    const intersects = raycaster.intersectObjects(blockMeshes, false);

    if (intersects.length === 0) {
      return false;
    }

    const intersection = intersects[0];
    if (intersection.distance > this.maxPlaceDistance) {
      return false;
    }

    return this.placeBlockAdjacentToExisting(intersection);
  }

  /**
   * Place a block adjacent to an existing block
   * @param {Object} intersection - The intersection data from raycasting
   * @returns {Boolean} Whether the block was placed successfully
   */
  placeBlockAdjacentToExisting(intersection) {
    const hitObject = intersection.object;

    const hitBlock = this.player.ship.blockManager.blocks.find(block =>
      block.mesh === hitObject
    );

    if (!hitBlock) {
      console.warn('Could not find block data for hit object');
      return false;
    }

    const newBlockPosition = this.player.ship.transform.computePlacementCellFromIntersection(intersection);
    if (!newBlockPosition) {
      return false;
    }

    // ponytail: must be adjacent on ship-local grid, not the hit cell itself
    const dx = Math.abs(newBlockPosition.x - hitBlock.position.x);
    const dy = Math.abs(newBlockPosition.y - hitBlock.position.y);
    const dz = Math.abs(newBlockPosition.z - hitBlock.position.z);
    const isAdjacent = (dx + dy + dz === 1);

    if (!isAdjacent) {
      console.warn('Placement cell is not adjacent to hit block', {
        hit: hitBlock.position,
        new: newBlockPosition
      });
      return false;
    }

    const existingBlock = this.player.ship.blockManager.blocks.find(block =>
      block.position.x === newBlockPosition.x &&
      block.position.y === newBlockPosition.y &&
      block.position.z === newBlockPosition.z
    );

    if (existingBlock) {
      return false;
    }

    return this.createAndAddBlock(newBlockPosition);
  }

  /**
   * Create a new block and add it to the ship
   * @param {Object} gridPos - The grid position for the new block
   * @returns {Boolean} Whether the block was created and added successfully
   */
  createAndAddBlock(gridPos) {
    console.log("createAndAddBlock called with position:", gridPos);
    
    try {
      // Check if we have a selected block
      if (!this.player.selectedBlock) {
        // Try to select a block from the current slot
        this.player.selectedBlock = this.player.inventory.getSelectedBlock();
        
        console.log("Selected block from inventory:", this.player.selectedBlock);
        
        if (!this.player.selectedBlock) {
          console.log("No block selected to place");
          return false;
        }
      }
      
      // Get the block type from the selected block
      const blockType = this.player.selectedBlock.type;
      console.log("Creating block of type:", blockType);
      
      // Create a new block
      const newBlock = BlockFactory.createBlock(blockType, gridPos);
      
      if (!newBlock) {
        console.error(`Failed to create block of type ${blockType}`);
        return false;
      }
      
      console.log("Block created:", newBlock);
      
      // Remove from inventory
      const removed = this.player.inventory.removeItem(this.player.inventory.selectedSlot);
      
      if (!removed) {
        console.error("Failed to remove block from inventory");
        return false;
      }
      
      console.log("Block removed from inventory");
      
      // Add the block to the ship
      const addedBlock = this.player.ship.blockManager.addBlock(newBlock, window.resourceLoader || this.createFallbackResourceLoader());
      
      console.log("Block added to ship:", addedBlock);
      console.log("Ship now has", this.player.ship.blockManager.blocks.length, "blocks");
      
      // Check if the block has a mesh
      if (newBlock.mesh) {
        console.log("Block has a mesh");
      } else {
        console.warn("Block does not have a mesh after adding to ship");
      }
      
      // Update UI
      this.player.ui.updateInventory();
      
      // Save ship to storage
      this.saveShipToStorage();
      
      return true;
    } catch (error) {
      console.error("Error creating and adding block:", error);
      return false;
    }
  }

  /**
   * Create a fallback resource loader
   * @returns {Object} - A simple fallback resource loader
   */
  createFallbackResourceLoader() {
    return {
      get: function(type) {
        // Create a canvas for the texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Fill with a color based on block type
        switch (type) {
          case 'wood': ctx.fillStyle = '#8B4513'; break;
          case 'stone': ctx.fillStyle = '#808080'; break;
          case 'lift': ctx.fillStyle = '#FFD700'; break;
          case 'cannon': ctx.fillStyle = '#696969'; break;
          case 'control': ctx.fillStyle = '#8B0000'; break;
          default: ctx.fillStyle = '#AAAAAA'; break;
        }
        
        ctx.fillRect(0, 0, 64, 64);
        
        // Add some visual distinction to the texture
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, 56, 56);
        
        // Add a label to help identify the block type
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(type, 32, 32);
        
        return new THREE.CanvasTexture(canvas);
      }
    };
  }

  /**
   * Clean up orphaned meshes at a specific position
   * @param {Object} gridPos - The grid position to check
   */
  cleanupOrphanedMeshesAtPosition(gridPos) {
    let orphanedMeshFound = false;
    
    this.player.ship.group.traverse(child => {
      if (child.isMesh && child.userData.isBlock) {
        // Get the local position in ship coordinates
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);
        
        const localPos = this.player.ship.worldToLocalPosition({
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z
        });
        
        // Round to grid coordinates
        const meshGridPos = {
          x: Math.round(localPos.x),
          y: Math.round(localPos.y),
          z: Math.round(localPos.z)
        };
        
        if (meshGridPos.x === gridPos.x && 
            meshGridPos.y === gridPos.y && 
            meshGridPos.z === gridPos.z) {
          if (child.parent) {
            child.parent.remove(child);
          }
          orphanedMeshFound = true;
        }
      }
    });
    
    return orphanedMeshFound;
  }

  /**
   * Save the ship to localStorage
   */
  saveShipToStorage() {
    if (this.player.shipStorage && this.player.username) {
      try {
        const shipDefinition = this.player.ship.serialize();
        this.player.shipStorage.saveShip(
          this.player.username,
          shipDefinition,
          this.player.activeShipSlot
        );
        console.log("Ship saved to localStorage");
      } catch (error) {
        console.error("Error saving ship to localStorage:", error);
      }
    }
  }
}

export default BlockInteractions; 