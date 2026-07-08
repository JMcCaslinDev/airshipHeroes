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
import {
  getBlockBreakSeconds,
  isUnbreakableBlock,
  breakProgressToStage
} from '../../../blocks/blockHardness.js';
import { setBlockCrackStage, clearBlockCrack } from './blockBreakOverlay.js';
import { updateBlockTargetOutline, clearBlockTargetOutline } from './blockTargetOutline.js';

class BlockInteractions {
  /**
   * Constructor for the BlockInteractions class
   * @param {Object} player - The player instance
   */
  constructor(player) {
    this.player = player;
    this.maxPlaceDistance = 5; // Maximum distance to place blocks
    this.mining = null;
  }

  positionKey(position) {
    return `${position.x},${position.y},${position.z}`;
  }

  /**
   * Raycast the block the player is looking at.
   * @returns {{ block: Object, mesh: THREE.Mesh, intersection: Object }|null}
   */
  getTargetBlock() {
    if (this.player.mode !== 'player') {
      return null;
    }

    const { eyePosition, lookDirection } = this.getEyePositionAndDirection();
    const raycaster = new THREE.Raycaster(eyePosition, lookDirection);
    raycaster.far = this.maxPlaceDistance;

    const blockMeshes = this.getBlockMeshes();
    const intersects = raycaster.intersectObjects(blockMeshes, false);
    if (!intersects.length) {
      return null;
    }

    const intersection = intersects[0];
    const block = this.resolveBlockFromIntersection(intersection);
    if (!block?.mesh) {
      return null;
    }

    return { block, mesh: block.mesh, intersection };
  }

  resolveBlockFromIntersection(intersection) {
    const mesh = intersection.object;
    if (mesh.userData?.block) {
      return mesh.userData.block;
    }

    const localPos = this.player.ship.worldToLocalPosition({
      x: intersection.point.x,
      y: intersection.point.y,
      z: intersection.point.z
    });
    return this.player.ship.getBlockAtLocalPosition(localPos);
  }

  /**
   * Hold-to-mine: advance progress each frame while targeting the same block.
   * @returns {boolean} true when a block was broken this tick
   */
  updateMining(deltaTime) {
    const target = this.getTargetBlock();
    if (!target) {
      this.cancelMining();
      return false;
    }

    const { block, mesh } = target;
    const key = this.positionKey(block.position);

    if (isUnbreakableBlock(block.type)) {
      this.cancelMining();
      return false;
    }

    if (!this.mining || this.mining.key !== key) {
      this.cancelMining();
      this.mining = { block, mesh, key, progress: 0 };
    }

    const breakSeconds = getBlockBreakSeconds(block.type);
    this.mining.progress += deltaTime / breakSeconds;
    setBlockCrackStage(mesh, breakProgressToStage(this.mining.progress));

    if (this.mining.progress >= 1) {
      const broke = this.finishBlockBreak(block);
      this.cancelMining();
      return broke;
    }

    return false;
  }

  cancelMining() {
    if (this.mining?.mesh) {
      clearBlockCrack(this.mining.mesh);
    }
    this.mining = null;
  }

  /** Show MC-style outline on the block under the crosshair. */
  updateTargetOutline() {
    if (this.player.mode !== 'player') {
      clearBlockTargetOutline();
      return;
    }
    const target = this.getTargetBlock();
    updateBlockTargetOutline(target?.mesh ?? null);
  }

  clearTargetOutline() {
    clearBlockTargetOutline();
  }

  /**
   * Break a block in the world (legacy single-click — completes instantly if called directly).
   */
  breakBlock() {
    const target = this.getTargetBlock();
    if (!target) {
      return false;
    }
    if (isUnbreakableBlock(target.block.type)) {
      return false;
    }
    return this.finishBlockBreak(target.block);
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
   * Remove a block and add drops to inventory.
   * @param {Object} block
   * @returns {boolean}
   */
  finishBlockBreak(block) {
    if (!block) {
      return false;
    }

    const blockType = block.type;
    const removed = this.player.ship.removeBlock(block.position);
    if (!removed) {
      return false;
    }

    clearBlockCrack(block.mesh);
    this.player.inventory.addItem({ type: blockType });
    this.player.validateShipBlocks();
    this.saveShipToStorage();
    return true;
  }

  /**
   * Handle the actual block breaking logic
   * @param {Object} intersection - The intersection data
   */
  handleBlockBreaking(intersection) {
    const block = this.resolveBlockFromIntersection(intersection);
    if (block) {
      this.finishBlockBreak(block);
      return;
    }

    console.error('No block data found on mesh');
    const mesh = intersection.object;
    if (mesh.parent) {
      mesh.parent.remove(mesh);
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
          case 'wood': ctx.fillStyle = '#BC986A'; break;
          case 'stone': ctx.fillStyle = '#7F7F7F'; break;
          case 'lift': ctx.fillStyle = '#E9ECEC'; break;
          case 'armor': ctx.fillStyle = '#985E2D'; break;
          case 'cannon': ctx.fillStyle = '#7F7F7F'; break;
          case 'control': ctx.fillStyle = '#6B4423'; break;
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