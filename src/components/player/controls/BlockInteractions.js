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
    
    // Cast ray to find where to place the block
    const raycaster = new THREE.Raycaster(eyePosition, lookDirection);
    raycaster.far = this.maxPlaceDistance;
    
    // Check if the ship exists and has blocks
    if (this.player.ship && this.player.ship.blockManager && this.player.ship.blockManager.blocks.length > 0) {
      // Try to place block adjacent to existing ship
      const placed = this.handleBlockPlacementWithExistingShip(raycaster, eyePosition, lookDirection);
      
      if (placed) {
        // Validate ship blocks after placing
        this.player.validateShipBlocks();
        
        // Save ship to storage
        this.saveShipToStorage();
        
        return true;
      }
    } else {
      // Handle first block placement (creating a new ship)
      const placed = this.handleFirstBlockPlacement(eyePosition, lookDirection);
      
      if (placed) {
        return true;
      }
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
   * Handle block placement when the ship already has blocks
   * @param {THREE.Raycaster} raycaster - The raycaster
   * @param {THREE.Vector3} eyePosition - The eye position
   * @param {THREE.Vector3} lookDirection - The look direction
   */
  handleBlockPlacementWithExistingShip(raycaster, eyePosition, lookDirection) {
    // Get all block meshes from the ship
    const blockMeshes = this.getBlockMeshes();
    
    // Check for intersection with block meshes
    const intersects = raycaster.intersectObjects(blockMeshes, false);
    
    if (intersects.length > 0) {
      // Get the first intersection
      const intersection = intersects[0];
      
      // Check if the intersection is within the maximum placement distance
      if (intersection.distance <= this.maxPlaceDistance) {
        this.placeBlockAdjacentToExisting(intersection);
      } else {
        console.log(`Intersection too far (${intersection.distance} > ${this.maxPlaceDistance})`);
      }
    } else {
      console.log("No direct intersection found, trying to place block in air");
      this.placeBlockInAir(eyePosition, lookDirection);
    }
  }

  /**
   * Place a block adjacent to an existing block
   * @param {Object} intersection - The intersection data from raycasting
   * @returns {Boolean} Whether the block was placed successfully
   */
  placeBlockAdjacentToExisting(intersection) {
    // Get the block that was hit
    const hitObject = intersection.object;
    
    // Find the corresponding block data
    const hitBlock = this.player.ship.blockManager.blocks.find(block => 
      block.mesh === hitObject
    );
    
    if (!hitBlock) {
      console.warn("Could not find block data for hit object");
      return false;
    }
    
    // Get the normal directly from the intersection
    const normal = intersection.face.normal.clone();
    
    console.log("Original face normal:", normal);
    
    // The normal is in local space of the block mesh
    // We need to transform it to world space, then to ship-local space
    
    // First, transform to world space
    const worldNormal = normal.clone().transformDirection(hitObject.matrixWorld);
    console.log("World normal:", worldNormal);
    
    // Then transform to ship-local space
    const shipLocalNormal = this.player.ship.transform.worldToLocalDirection({
      x: worldNormal.x,
      y: worldNormal.y,
      z: worldNormal.z
    });
    
    console.log("Ship-local normal:", shipLocalNormal);
    
    // Round the normal to get a grid direction
    const direction = {
      x: Math.round(shipLocalNormal.x),
      y: Math.round(shipLocalNormal.y),
      z: Math.round(shipLocalNormal.z)
    };
    
    console.log("Grid direction:", direction);
    
    // Calculate the position for the new block in ship-local coordinates
    const newBlockPosition = {
      x: hitBlock.position.x + direction.x,
      y: hitBlock.position.y + direction.y,
      z: hitBlock.position.z + direction.z
    };
    
    console.log("Hit block position:", hitBlock.position);
    console.log("New block position (ship-local):", newBlockPosition);
    
    // Validate the position is not occupied
    const existingBlock = this.player.ship.blockManager.blocks.find(block => 
      block.position.x === newBlockPosition.x &&
      block.position.y === newBlockPosition.y &&
      block.position.z === newBlockPosition.z
    );
    
    if (existingBlock) {
      console.log("Cannot place block: position already occupied");
      return false;
    }
    
    // Create and add the block
    return this.createAndAddBlock(newBlockPosition);
  }

  /**
   * Place a block in the air (not adjacent to any existing block)
   * @param {THREE.Vector3} eyePosition - The eye position
   * @param {THREE.Vector3} lookDirection - The look direction
   */
  placeBlockInAir(eyePosition, lookDirection) {
    // Place block in air at a fixed distance
    const placementPos = new THREE.Vector3().copy(eyePosition).add(
      lookDirection.clone().multiplyScalar(Math.min(3, this.maxPlaceDistance))
    );
    
    // Round to grid position in world coordinates
    placementPos.x = Math.round(placementPos.x);
    placementPos.y = Math.round(placementPos.y);
    placementPos.z = Math.round(placementPos.z);
    
    console.log("World placement position:", placementPos);
    
    // Convert world position to ship-local coordinates
    const gridPos = this.player.ship.worldToLocalPosition({
      x: placementPos.x,
      y: placementPos.y,
      z: placementPos.z
    });
    
    // Round to ensure we're on the grid
    gridPos.x = Math.round(gridPos.x);
    gridPos.y = Math.round(gridPos.y);
    gridPos.z = Math.round(gridPos.z);
    
    console.log("Ship-local grid position:", gridPos);
    
    // Check if position is within placement range
    const distance = eyePosition.distanceTo(placementPos);
    
    if (distance <= this.maxPlaceDistance) {
      // Check if there's already a block at this position
      const existingBlock = this.player.ship.blockManager.blocks.find(block => 
        block.position.x === gridPos.x &&
        block.position.y === gridPos.y &&
        block.position.z === gridPos.z
      );
      
      if (!existingBlock) {
        // Remove from inventory
        const removed = this.player.inventory.removeItem(this.player.inventory.selectedSlot);
        
        if (removed) {
          this.createAndAddBlock(gridPos);
        } else {
          console.error("Failed to remove block from inventory");
        }
      } else {
        console.error("Block already exists at this position");
      }
    } else {
      console.log(`Block placement too far (${distance} > ${this.maxPlaceDistance})`);
    }
  }

  /**
   * Handle placing the first block on an empty ship
   * @param {THREE.Vector3} eyePosition - The eye position
   * @param {THREE.Vector3} lookDirection - The look direction
   */
  handleFirstBlockPlacement(eyePosition, lookDirection) {
    // Place the first block at a distance in front of the player
    const placementPos = new THREE.Vector3().copy(eyePosition).add(
      lookDirection.clone().multiplyScalar(2) // Place 2 units in front of player
    );
    
    // Round to grid position in world coordinates
    placementPos.x = Math.round(placementPos.x);
    placementPos.y = Math.round(placementPos.y);
    placementPos.z = Math.round(placementPos.z);
    
    console.log("World placement position for first block:", placementPos);
    
    // Convert world position to ship-local coordinates
    const gridPos = this.player.ship.worldToLocalPosition({
      x: placementPos.x,
      y: placementPos.y,
      z: placementPos.z
    });
    
    // Round to ensure we're on the grid
    gridPos.x = Math.round(gridPos.x);
    gridPos.y = Math.round(gridPos.y);
    gridPos.z = Math.round(gridPos.z);
    
    console.log("Ship-local grid position for first block:", gridPos);
    
    // Remove from inventory
    const removed = this.player.inventory.removeItem(this.player.inventory.selectedSlot);
    
    if (removed) {
      this.createAndAddBlock(gridPos);
    } else {
      console.error("Failed to remove block from inventory");
    }
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
        this.player.shipStorage.saveShip(this.player.username, shipDefinition);
        console.log("Ship saved to localStorage");
      } catch (error) {
        console.error("Error saving ship to localStorage:", error);
      }
    }
  }
}

export default BlockInteractions; 