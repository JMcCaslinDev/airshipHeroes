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
    if (this.player.ship && this.player.ship.blocks.length > 0) {
      // Get all block meshes from the ship
      const blockMeshes = this.getBlockMeshes();
      
      // Check for intersection with block meshes
      const intersects = raycaster.intersectObjects(blockMeshes, false);
      
      if (intersects.length > 0) {
        // Get the first intersection
        const intersection = intersects[0];
        
        // Check if the intersection is within the maximum distance
        if (intersection.distance <= this.maxPlaceDistance) {
          this.handleBlockBreaking(intersection);
        } else {
          console.log(`Block too far to break (${intersection.distance} > ${this.maxPlaceDistance})`);
        }
      } else {
        console.log("No block found to break");
      }
    } else {
      console.log("No ship or blocks available to break");
    }
    
    // Validate ship blocks after breaking
    this.player.validateShipBlocks();
    
    // Clean up the ship to remove any ghost blocks
    this.player.cleanupShip();
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
    
    // Check if we have a selected block
    if (!this.player.selectedBlock) {
      // Try to select a block from the current slot
      this.player.selectedBlock = this.player.inventory.getSelectedBlock();
      
      // Still no block selected? Try to find a non-empty slot
      if (!this.player.selectedBlock) {
        for (let i = 0; i < this.player.inventory.slots.length; i++) {
          if (this.player.inventory.slots[i]) {
            this.player.inventory.selectSlot(i);
            this.player.selectedBlock = this.player.inventory.getSelectedBlock();
            this.player.ui.updateInventory();
            break;
          }
        }
      }
      
      // Still no block selected? Can't place anything
      if (!this.player.selectedBlock) {
        console.log("No blocks in inventory to place");
        return;
      }
    }
    
    console.log(`Placing block of type: ${this.player.selectedBlock.type}`);
    
    const { eyePosition, lookDirection } = this.getEyePositionAndDirection();
    
    // Cast ray to find placement position
    const raycaster = new THREE.Raycaster(eyePosition, lookDirection);
    raycaster.far = this.maxPlaceDistance;
    
    // Check for intersection with the ship
    if (this.player.ship && this.player.ship.blocks.length > 0) {
      this.handleBlockPlacementWithExistingShip(raycaster, eyePosition, lookDirection);
    } else if (this.player.ship) {
      this.handleFirstBlockPlacement(eyePosition, lookDirection);
    } else {
      console.log("No ship available to place blocks on");
    }
    
    // Validate ship blocks after placing
    this.player.validateShipBlocks();
    
    // Clean up the ship to remove any ghost blocks
    this.player.cleanupShip();
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
   * @returns {Array} - Array of block meshes
   */
  getBlockMeshes() {
    const blockMeshes = [];
    
    this.player.ship.group.traverse(child => {
      if (child.isMesh && child.userData.isBlock) {
        blockMeshes.push(child);
      }
    });
    
    return blockMeshes;
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
   * @param {Object} intersection - The intersection data
   */
  placeBlockAdjacentToExisting(intersection) {
    try {
      // Get the block that was hit
      const hitBlockData = intersection.object.userData.block;
      
      if (!hitBlockData) {
        console.warn("No block data found in the hit object's userData");
        return;
      }
      
      // Get the face normal in local space
      const faceNormal = intersection.face.normal.clone();
      
      // Transform the normal to world space
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
      const worldNormal = faceNormal.clone().applyMatrix3(normalMatrix).normalize();
      
      // Convert world normal to ship space by applying inverse ship rotation
      const shipRotationY = this.player.ship.rotation;
      const rotationMatrix = new THREE.Matrix4().makeRotationY(-shipRotationY);
      const shipSpaceNormal = worldNormal.clone().applyMatrix4(rotationMatrix);
      
      // Find the dominant axis
      const absX = Math.abs(shipSpaceNormal.x);
      const absY = Math.abs(shipSpaceNormal.y);
      const absZ = Math.abs(shipSpaceNormal.z);
      
      // Calculate direction vector
      let direction = { x: 0, y: 0, z: 0 };
      
      if (absX >= absY && absX >= absZ) {
        direction.x = Math.sign(shipSpaceNormal.x);
      } else if (absY >= absX && absY >= absZ) {
        direction.y = Math.sign(shipSpaceNormal.y);
      } else {
        direction.z = Math.sign(shipSpaceNormal.z);
      }
      
      // Calculate the grid position for the new block
      const newBlockGridPos = {
        x: hitBlockData.position.x + direction.x,
        y: hitBlockData.position.y + direction.y,
        z: hitBlockData.position.z + direction.z
      };
      
      // Check if there's already a block at this position
      const existingBlock = this.player.ship.getBlockAtLocalPosition(newBlockGridPos);
      
      if (existingBlock) {
        console.log("Block already exists at this position");
        return;
      }
      
      // Check for orphaned meshes at this position and clean them up
      this.cleanupOrphanedMeshesAtPosition(newBlockGridPos);
      
      // Remove from inventory
      const removed = this.player.inventory.removeItem(this.player.inventory.selectedSlot);
      
      if (removed) {
        this.createAndAddBlock(newBlockGridPos);
      } else {
        console.error("Failed to remove block from inventory");
      }
    } catch (error) {
      console.error("Error calculating block placement:", error);
    }
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
    
    // Round to grid position
    placementPos.x = Math.round(placementPos.x);
    placementPos.y = Math.round(placementPos.y);
    placementPos.z = Math.round(placementPos.z);
    
    // Convert to grid position relative to ship
    const gridPos = {
      x: Math.round(placementPos.x - this.player.ship.position.x),
      y: Math.round(placementPos.y - this.player.ship.position.y),
      z: Math.round(placementPos.z - this.player.ship.position.z)
    };
    
    // Check if position is within placement range
    const distance = eyePosition.distanceTo(new THREE.Vector3(
      gridPos.x + this.player.ship.position.x,
      gridPos.y + this.player.ship.position.y,
      gridPos.z + this.player.ship.position.z
    ));
    
    if (distance <= this.maxPlaceDistance) {
      // Check if there's already a block at this position
      const existingBlock = this.player.ship.blocks.find(block => 
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
    
    // Round to grid position
    placementPos.x = Math.round(placementPos.x);
    placementPos.y = Math.round(placementPos.y);
    placementPos.z = Math.round(placementPos.z);
    
    // Convert to grid position relative to ship
    const gridPos = {
      x: Math.round(placementPos.x - this.player.ship.position.x),
      y: Math.round(placementPos.y - this.player.ship.position.y),
      z: Math.round(placementPos.z - this.player.ship.position.z)
    };
    
    // Remove from inventory
    const removed = this.player.inventory.removeItem(this.player.inventory.selectedSlot);
    
    if (removed) {
      this.createAndAddBlock(gridPos);
    } else {
      console.error("Failed to remove block from inventory");
    }
  }

  /**
   * Create and add a block to the ship
   * @param {Object} gridPos - The grid position for the new block
   */
  createAndAddBlock(gridPos) {
    // Use BlockFactory to create the new block
    const newBlock = BlockFactory.createBlock(
      this.player.selectedBlock.type,
      { ...gridPos },
      { rotation: 0 }
    );
    
    if (!newBlock) {
      console.error("Failed to create new block using BlockFactory");
      // Add the item back to inventory since creation failed
      this.player.inventory.addItem({ type: this.player.selectedBlock.type });
      return;
    }
    
    // Get the resource loader
    let resourceLoader = window.resourceLoader;
    
    // If window.resourceLoader is not available, use a simple fallback
    if (!resourceLoader) {
      resourceLoader = this.createFallbackResourceLoader();
    }
    
    // Create the mesh before adding to the ship
    newBlock.createMesh(this.player.ship.group, resourceLoader);
    
    // Add to ship's blocks array
    this.player.ship.blocks.push(newBlock);
    
    // Force update the ship's group to ensure the new block is visible
    this.player.ship.group.updateMatrixWorld(true);
    
    // Explicitly update the block mesh position to ensure it's correct
    newBlock.mesh.position.set(
      newBlock.position.x,
      newBlock.position.y,
      newBlock.position.z
    );
    
    // Ensure the mesh has the correct userData
    newBlock.mesh.userData.block = newBlock;
    newBlock.mesh.userData.isBlock = true;
    newBlock.mesh.userData.type = newBlock.type;
    newBlock.mesh.userData.gridPosition = { ...newBlock.position };
    
    // Save ship to localStorage
    this.saveShipToStorage();
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