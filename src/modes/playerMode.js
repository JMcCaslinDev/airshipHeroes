/**
 * Player Mode Module
 * 
 * Handles controls and camera for Player Mode.
 */

import * as THREE from 'three';
import BlockFactory from '../blocks/blockFactory.js';

/**
 * Create a player mode controller
 * @param {Object} player - The player object
 * @param {THREE.Camera} camera - The Three.js camera
 * @returns {Object} - The player mode controller
 */
export function createPlayerModeController(player, camera) {
  // Controller state
  const state = {
    active: false,
    player,
    camera,
    // Camera settings
    cameraHeight: 1.6, // Eye level
    cameraRotation: { x: 0, y: 0 },
    maxPlaceDistance: 4,
    
    // Physics constants
    gravity: 9.8,
    jumpVelocity: 8.0,
    moveSpeed: 2.5,
    
    // Raycaster for block placement and breaking
    raycaster: new THREE.Raycaster(),
    
    // Mouse button states to prevent multiple actions per click
    leftMouseDown: false,
    rightMouseDown: false,
    processingBlockAction: false,
    blockActionTimeout: null
  };
  
  // Initialize raycaster with proper settings
  state.raycaster.near = 0.1;
  state.raycaster.far = state.maxPlaceDistance;
  state.raycaster.precision = 0.1;

  // Add a flag to track if blocks have been changed
  let blocksChanged = false;
  
  /**
   * Activate player mode
   */
  function activate() {
    state.active = true;
    player.mode = 'player';
    
    console.log('Activating player mode');
    
    // Reset block action processing flag
    state.processingBlockAction = false;
    
    // Reset mouse button states
    state.leftMouseDown = false;
    state.rightMouseDown = false;
    
    // Sync camera rotation with player's camera rotation
    state.cameraRotation.x = player.cameraRotation.x;
    state.cameraRotation.y = player.cameraRotation.y;
    
    // Show character mesh
    if (player.character && player.character.mesh) {
      player.character.mesh.visible = true;
    }
    
    // Position character at ship's control block
    if (player.ship) {
      // Find the control block
      const controlBlock = player.ship.blocks.find(block => block.type === 'control');
      
      if (controlBlock) {
        console.log('Found control block at position:', controlBlock.position);
        
        // Position player on top of the control block
        player.character.position.x = player.ship.position.x + controlBlock.position.x;
        player.character.position.y = player.ship.position.y + controlBlock.position.y + 1.0; // Stand on top of the block
        player.character.position.z = player.ship.position.z + controlBlock.position.z;
        
        // Update character mesh position
        if (player.character.mesh) {
          player.character.mesh.position.set(
            player.character.position.x,
            player.character.position.y,
            player.character.position.z
          );
        }
        
        console.log('Positioned player at:', player.character.position);
      } else {
        console.warn('No control block found on ship, using default position');
        
        // Fallback to positioning at ship's center if no control block is found
        player.character.position.x = player.ship.position.x;
        player.character.position.y = player.ship.position.y + 1.0; // Stand on top of the ship
        player.character.position.z = player.ship.position.z;
        
        // Update character mesh position
        if (player.character.mesh) {
          player.character.mesh.position.set(
            player.character.position.x,
            player.character.position.y,
            player.character.position.z
          );
        }
      }
    }
    
    // Add player-mode class to body
    document.body.classList.add('player-mode');
    
    // Reset inventory selection to first slot when entering player mode
    player.inventory.selectedSlot = 0;
    
    // Initialize inventory UI
    const inventoryElement = document.getElementById('inventory');
    if (inventoryElement) {
      // Show inventory
      inventoryElement.style.display = 'flex';
      
      // Update selected slot
      const slots = inventoryElement.querySelectorAll('.inventory-slot');
      if (slots && slots.length > 0) {
        // Remove selected class from all slots
        slots.forEach(slot => {
          slot.classList.remove('selected');
        });
        
        // Add selected class to the first slot
        if (slots.length > 0) {
          slots[0].classList.add('selected');
          console.log('Reset selected slot to 0 when entering player mode');
        }
      }
    }
    
    // Ensure crosshair is visible in player mode
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
      console.log('Found crosshair element, making it visible');
      
      // Force visibility with all possible methods
      crosshair.style.display = 'block';
      crosshair.style.visibility = 'visible';
      crosshair.style.opacity = '1';
      crosshair.style.zIndex = '99999';
      
      // Add a debug border to make it more visible
      crosshair.style.border = '2px solid red';
      crosshair.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      
      // Force a redraw
      crosshair.offsetHeight;
      
      // Log current crosshair styles
      const computedStyle = window.getComputedStyle(crosshair);
      console.log('Crosshair computed styles:', {
        display: computedStyle.display,
        zIndex: computedStyle.zIndex,
        opacity: computedStyle.opacity,
        visibility: computedStyle.visibility,
        width: computedStyle.width,
        height: computedStyle.height,
        top: computedStyle.top,
        left: computedStyle.left,
        position: computedStyle.position
      });
    } else {
      console.error('CRITICAL: Crosshair element not found in DOM when activating player mode');
      
      // Try to recreate the crosshair
      if (typeof createCrosshair === 'function') {
        console.log('Attempting to recreate crosshair');
        const newCrosshair = createCrosshair();
        if (newCrosshair) {
          newCrosshair.show();
          console.log('Crosshair recreated successfully');
        }
      }
    }
    
    // Request pointer lock
    document.body.requestPointerLock();
    
    // Update camera
    updateCamera();
  }
  
  /**
   * Deactivate player mode
   */
  function deactivate() {
    state.active = false;
    
    // Reset block action processing flag
    state.processingBlockAction = false;
    
    // Reset mouse button states to prevent actions carrying over
    state.leftMouseDown = false;
    state.rightMouseDown = false;
    
    // Remove player-mode class from body
    document.body.classList.remove('player-mode');
    
    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Cancel any pending timeouts for processing block actions
    if (state.blockActionTimeout) {
      clearTimeout(state.blockActionTimeout);
      state.blockActionTimeout = null;
    }
    
    // Save ship if blocks were changed
    if (blocksChanged && player.shipStorage && player.username && player.ship) {
      try {
        const shipDefinition = player.ship.serialize();
        player.shipStorage.saveShip(player.username, shipDefinition);
        console.log("Ship saved to localStorage on player mode deactivation");
        blocksChanged = false;
      } catch (error) {
        console.error("Error saving ship to localStorage:", error);
      }
    }
  }
  
  /**
   * Reset the block action processing flag
   */
  function resetBlockActionFlag() {
    if (state.processingBlockAction) {
      console.log("Manually resetting block action processing flag");
      state.processingBlockAction = false;
      
      // Clear any pending timeout
      if (state.blockActionTimeout) {
        clearTimeout(state.blockActionTimeout);
        state.blockActionTimeout = null;
        console.log("Cleared pending block action timeout");
      }
    }
  }
  
  /**
   * Handle keyboard input
   * @param {Object} keys - The key states
   */
  function handleInput(keys) {
    if (!state.active) return;
    
    // Calculate movement direction based on camera rotation
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (keys.forward) {
      moveDirection.z -= 1;
    }
    if (keys.backward) {
      moveDirection.z += 1;
    }
    if (keys.left) {
      moveDirection.x -= 1;
    }
    if (keys.right) {
      moveDirection.x += 1;
    }
    
    // Normalize movement direction
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Create a direction vector based on camera orientation
      const forward = new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(1, 0, 0);
      
      // Apply camera rotation to these vectors
      forward.applyEuler(new THREE.Euler(0, state.cameraRotation.y, 0, 'YXZ'));
      right.applyEuler(new THREE.Euler(0, state.cameraRotation.y, 0, 'YXZ'));
      
      // Calculate final movement direction
      const finalDirection = new THREE.Vector3(0, 0, 0);
      
      if (keys.forward) finalDirection.add(forward);
      if (keys.backward) finalDirection.sub(forward);
      if (keys.right) finalDirection.add(right);
      if (keys.left) finalDirection.sub(right);
      
      // Normalize and scale by move speed
      if (finalDirection.length() > 0) {
        finalDirection.normalize().multiplyScalar(state.moveSpeed);
        
        // Apply movement
        player.character.velocity.x = finalDirection.x;
        player.character.velocity.z = finalDirection.z;
      } else {
        // Stop horizontal movement
        player.character.velocity.x = 0;
        player.character.velocity.z = 0;
      }
    } else {
      // Stop horizontal movement
      player.character.velocity.x = 0;
      player.character.velocity.z = 0;
    }
    
    // Handle jumping
    if (keys.up && !player.character.isJumping) {
      player.character.velocity.y = state.jumpVelocity;
      player.character.isJumping = true;
    }
    
    // Handle sneaking
    player.character.isSneaking = keys.down;
    
    // Handle inventory slot selection - only in player mode
    if (player.mode === 'player') {
      let slotChanged = false;
      let newSlot = player.inventory.selectedSlot;
      
      if (keys.slot1) {
        newSlot = 0;
        slotChanged = true;
      } else if (keys.slot2) {
        newSlot = 1;
        slotChanged = true;
      } else if (keys.slot3) {
        newSlot = 2;
        slotChanged = true;
      } else if (keys.slot4) {
        newSlot = 3;
        slotChanged = true;
      } else if (keys.slot5) {
        newSlot = 4;
        slotChanged = true;
      } else if (keys.slot6) {
        newSlot = 5;
        slotChanged = true;
      } else if (keys.slot7) {
        newSlot = 6;
        slotChanged = true;
      } else if (keys.slot8) {
        newSlot = 7;
        slotChanged = true;
      } else if (keys.slot9) {
        newSlot = 8;
        slotChanged = true;
      }
      
      if (slotChanged) {
        console.log(`Selected inventory slot ${newSlot + 1} in player mode`);
        player.inventory.selectedSlot = newSlot;
        
        // Force immediate UI update for inventory
        const inventoryElement = document.getElementById('inventory');
        if (inventoryElement) {
          const slots = inventoryElement.querySelectorAll('.inventory-slot');
          
          // Remove selected class from all slots
          slots.forEach(slot => {
            slot.classList.remove('selected');
          });
          
          // Add selected class to the new slot
          if (newSlot >= 0 && newSlot < slots.length) {
            slots[newSlot].classList.add('selected');
          }
        }
      }
    }
  }
  
  /**
   * Handle mouse movement
   * @param {number} deltaX - The change in X position
   * @param {number} deltaY - The change in Y position
   */
  function handleMouseMove(deltaX, deltaY) {
    if (!state.active) return;
    
    // Update camera rotation
    state.cameraRotation.y -= deltaX * 0.002;
    state.cameraRotation.x -= deltaY * 0.002;
    
    // Clamp vertical rotation
    state.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.cameraRotation.x));
    
    // Update character rotation
    player.character.rotation = state.cameraRotation.y;
    player.character.mesh.rotation.y = state.cameraRotation.y;
    
    // Sync with player's camera rotation
    player.cameraRotation.x = state.cameraRotation.x;
    player.cameraRotation.y = state.cameraRotation.y;
    
    // Update camera
    updateCamera();
  }
  
  /**
   * Handle mouse down
   * @param {MouseEvent} event - The mouse event
   */
  function handleMouseDown(event) {
    if (!state.active) return;
    
    // Prevent default behavior to avoid text selection and context menus
    event.preventDefault();
    event.stopPropagation();
    
    // Left click: break block
    if (event.button === 0) {
      // Only process if we haven't already processed a left click
      if (!state.leftMouseDown && !state.processingBlockAction) {
        console.log("Left mouse button pressed - breaking block");
        state.leftMouseDown = true;
        state.processingBlockAction = true;
        
        // Add a tiny delay to ensure we're not catching multiple events
        requestAnimationFrame(() => {
          breakBlock();
        });
      } else {
        console.log("Left mouse already down or processing action - ignoring");
      }
      return;
    }
    
    // Right click: place block
    if (event.button === 2) {
      // Only process if we haven't already processed a right click
      if (!state.rightMouseDown && !state.processingBlockAction) {
        console.log("Right mouse button pressed - placing block");
        state.rightMouseDown = true;
        state.processingBlockAction = true;
        
        // Add a tiny delay to ensure we're not catching multiple events
        requestAnimationFrame(() => {
          placeBlock();
        });
      } else {
        console.log("Right mouse already down or processing action - ignoring");
      }
      return;
    }
  }
  
  /**
   * Handle mouse up
   * @param {MouseEvent} event - The mouse event
   */
  function handleMouseUp(event) {
    if (!state.active) return;
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Reset mouse button states
    if (event.button === 0) {
      console.log("Left mouse button released");
      state.leftMouseDown = false;
      // Reset processing flag after a short delay to prevent rapid re-clicks
      setTimeout(() => {
        if (!state.leftMouseDown) {
          state.processingBlockAction = false;
        }
      }, 100); // Shorter delay for better responsiveness
    }
    
    if (event.button === 2) {
      console.log("Right mouse button released");
      state.rightMouseDown = false;
      // Reset processing flag after a short delay to prevent rapid re-clicks
      setTimeout(() => {
        if (!state.rightMouseDown) {
          state.processingBlockAction = false;
        }
      }, 100); // Shorter delay for better responsiveness
    }
  }
  
  /**
   * Place a block
   */
  function placeBlock() {
    if (state.processingBlockAction) {
      console.log("Already processing a block action, ignoring");
      return;
    }
    
    try {
      // Get selected block type from inventory
      const selectedSlot = player.inventory.selectedSlot;
      const inventorySlot = player.inventory.slots[selectedSlot];
      
      if (!inventorySlot || !inventorySlot.type || inventorySlot.count <= 0) {
        console.log('No block selected or no blocks left in inventory');
        return;
      }
      
      const blockType = inventorySlot.type;
      console.log(`Attempting to place block of type: ${blockType}`);
      
      // Get the ray origin and direction from the camera
      const origin = new THREE.Vector3(
        player.character.position.x,
        player.character.position.y + state.cameraHeight,
        player.character.position.z
      );
      
      const direction = new THREE.Vector3(
        -Math.sin(state.cameraRotation.y) * Math.cos(state.cameraRotation.x),
        Math.sin(state.cameraRotation.x),
        -Math.cos(state.cameraRotation.y) * Math.cos(state.cameraRotation.x)
      ).normalize();
      
      // Create a fresh raycaster for this operation
      const placementRaycaster = new THREE.Raycaster(origin, direction);
      placementRaycaster.near = 0.001; // Start extremely close to avoid self-intersection
      placementRaycaster.far = state.maxPlaceDistance;
      placementRaycaster.precision = 0.0001; // Extremely high precision for accurate block placement
      
      console.log("Raycaster set up:", {
        origin: JSON.stringify(origin),
        direction: JSON.stringify(direction),
        far: state.maxPlaceDistance,
        precision: placementRaycaster.precision
      });
      
      // Validate ship exists
      if (!player.ship || !player.ship.group) {
        console.log('No ship or ship group available');
        return;
      }
      
      // Create a filtered list of all block meshes in the ship
      const blockMeshes = [];
      player.ship.group.children.forEach(child => {
        if (child.isMesh && child.userData && child.userData.isBlock) {
          // Skip any meshes without position data - these can't be processed properly
          if (child.userData.gridPosition || (child.userData.block && child.userData.block.position)) {
            blockMeshes.push(child);
          }
        }
      });
      
      console.log(`Found ${blockMeshes.length} valid block meshes to check for intersection`);
      
      // Pre-check: if no blocks, we can't place against anything
      if (blockMeshes.length === 0) {
        console.log('No valid block meshes found, nothing to place against');
        return;
      }
      
      // Perform raycasting only on valid block meshes
      const intersects = placementRaycaster.intersectObjects(blockMeshes, false);
      
      // No intersections found - log and exit
      if (intersects.length === 0) {
        console.log('No intersections found with block meshes');
        return;
      }
      
      // Only consider the first (closest) intersection
      const intersect = intersects[0];
      console.log(`Found intersection at distance ${intersect.distance.toFixed(4)}`);
      
      // Check if the block is within reach
      if (intersect.distance > state.maxPlaceDistance) {
        console.log(`Too far to place block (${intersect.distance.toFixed(4)} > ${state.maxPlaceDistance})`);
        return;
      }
      
      // Calculate position for new block using the face normal
      const normal = intersect.face.normal.clone();
      normal.transformDirection(intersect.object.matrixWorld);
      
      // Calculate the exact position where the block should be placed
      const intersectPoint = intersect.point.clone();
      const blockSize = 1; // Size of a block
      
      // Offset the position by a tiny amount in the normal direction to avoid floating point issues
      const epsilon = 0.001;
      intersectPoint.add(normal.multiplyScalar(epsilon));
      
      // Round to nearest block position
      const newBlockPosition = {
        x: Math.round(intersectPoint.x),
        y: Math.round(intersectPoint.y),
        z: Math.round(intersectPoint.z)
      };
      
      // Validate the position is not occupied
      const existingBlock = player.ship.blocks.find(block => 
        block.position.x === newBlockPosition.x &&
        block.position.y === newBlockPosition.y &&
        block.position.z === newBlockPosition.z
      );
      
      if (existingBlock) {
        console.log('Position already occupied by a block');
        state.processingBlockAction = false;
        return;
      }
      
      // Convert to ship-local coordinates
      const localPosition = player.ship.worldToLocalPosition(newBlockPosition);
      
      // Store the current number of blocks for verification
      const initialBlockCount = player.ship.blocks.length;
      
      // Validate the position isn't already occupied
      // Check both the ship's blocks array and the scene
      const blockAtPosition = player.ship.getBlockAtLocalPosition(localPosition);
      
      if (blockAtPosition) {
        console.log('Position already occupied by a block in the ship');
        return;
      }
      
      // Also check for mesh overlap by checking exact grid positions
      let meshAtPosition = false;
      player.ship.group.children.forEach(child => {
        if (child.isMesh && child.userData && child.userData.isBlock) {
          const meshPos = child.userData.gridPosition || 
                         (child.userData.block ? child.userData.block.position : null);
          
          if (meshPos && 
              meshPos.x === localPosition.x && 
              meshPos.y === localPosition.y && 
              meshPos.z === localPosition.z) {
            meshAtPosition = true;
          }
        }
      });
      
      if (meshAtPosition) {
        console.log('Position already occupied by a mesh in the scene');
        return;
      }
      
      // Create the block using BlockFactory
      const block = BlockFactory.createBlock(
        blockType,
        localPosition,
        { rotation: 0 }
      );
      
      if (!block) {
        console.error(`Failed to create block of type ${blockType}`);
        return;
      }
      
      console.log(`Created block of type ${blockType}`);
      
      // Create mesh for the block with proper textures
      if (window.resourceLoader) {
        block.createMesh(player.ship.group, window.resourceLoader);
        console.log(`Created mesh with textures from resource loader`);
      } else {
        console.warn('Resource loader not available, block may not have textures');
        // Fallback to creating a mesh with a color
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
          color: getBlockColor(blockType),
          roughness: 0.7,
          metalness: 0.2
        });
        
        block.mesh = new THREE.Mesh(geometry, material);
        block.mesh.position.set(localPosition.x, localPosition.y, localPosition.z);
        block.mesh.castShadow = true;
        block.mesh.receiveShadow = true;
        
        // Set userData for the mesh
        block.mesh.userData.block = block;
        block.mesh.userData.isBlock = true;
        block.mesh.userData.type = block.type;
        block.mesh.userData.gridPosition = { ...localPosition };
        
        player.ship.group.add(block.mesh);
        console.log(`Created mesh with fallback color`);
      }
      
      // Add block to ship's blocks array
      player.ship.blocks.push(block);
      
      // Verify only one block was added
      const finalBlockCount = player.ship.blocks.length;
      if (finalBlockCount !== initialBlockCount + 1) {
        console.warn(`Expected to add 1 block, but block count changed from ${initialBlockCount} to ${finalBlockCount}`);
      }
      
      // Remove block from inventory using player's method if available
      if (typeof player.removeFromInventory === 'function') {
        player.removeFromInventory(selectedSlot);
      } else {
        // Fallback inventory management
        inventorySlot.count--;
        if (inventorySlot.count <= 0) {
          inventorySlot.type = null;
        }
      }
      
      console.log(`Successfully placed ${blockType} block at position:`, localPosition);
      
      // Fix any texture issues that might have occurred
      if (typeof player.ship.fixBlockTextureIssues === 'function') {
        player.ship.fixBlockTextureIssues();
      }
      
      // Save ship to localStorage if shipStorage is available
      if (player.shipStorage && player.username) {
        try {
          const shipDefinition = player.ship.serialize();
          player.shipStorage.saveShip(player.username, shipDefinition);
          console.log("Ship saved to localStorage after block placement");
        } catch (error) {
          console.error("Error saving ship to localStorage:", error);
        }
      }
      
      // Set the blocks changed flag
      blocksChanged = true;
    } catch (error) {
      console.error('Error placing block:', error);
      state.processingBlockAction = false; // Reset on error
    }
  }
  
  /**
   * Break a block
   */
  function breakBlock() {
    if (state.processingBlockAction) {
      console.log("Already processing a block action, ignoring");
      return;
    }
    
    try {
      // Get the ray origin and direction from the camera
      const origin = new THREE.Vector3(
        player.character.position.x,
        player.character.position.y + state.cameraHeight,
        player.character.position.z
      );
      
      const direction = new THREE.Vector3(
        -Math.sin(state.cameraRotation.y) * Math.cos(state.cameraRotation.x),
        Math.sin(state.cameraRotation.x),
        -Math.cos(state.cameraRotation.y) * Math.cos(state.cameraRotation.x)
      ).normalize();
      
      // Create a fresh raycaster for this operation
      const breakRaycaster = new THREE.Raycaster(origin, direction);
      breakRaycaster.near = 0.001; // Start extremely close to avoid self-intersection
      breakRaycaster.far = state.maxPlaceDistance;
      breakRaycaster.precision = 0.0001; // Extremely high precision for accurate block selection
      
      // Find intersections with ship blocks
      if (!player.ship || !player.ship.group) {
        console.log('No ship or ship group available');
        state.processingBlockAction = false;
        return;
      }
      
      // Create a filtered list of all block meshes in the ship
      const blockMeshes = [];
      player.ship.group.children.forEach(child => {
        if (child.isMesh && child.userData && child.userData.isBlock) {
          // Skip any meshes without position data - these can't be processed properly
          if (child.userData.gridPosition || (child.userData.block && child.userData.block.position)) {
            blockMeshes.push(child);
          }
        }
      });
      
      // Store the current number of blocks for verification
      const initialBlockCount = player.ship.blocks.length;
      
      // Perform raycasting only on valid block meshes
      const intersects = breakRaycaster.intersectObjects(blockMeshes, false);
      
      if (intersects.length === 0) {
        console.log('No intersections found with block meshes');
        state.processingBlockAction = false;
        return;
      }
      
      // Only consider the first (closest) intersection
      const intersect = intersects[0];
      
      if (intersect.distance > state.maxPlaceDistance) {
        console.log(`Block too far to break (${intersect.distance.toFixed(4)} > ${state.maxPlaceDistance})`);
        state.processingBlockAction = false;
        return;
      }
      
      const blockMesh = intersect.object;
      
      if (!blockMesh.userData) {
        console.log('No userData found on mesh');
        state.processingBlockAction = false;
        return;
      }
      
      // Extract block information
      let block = null;
      let blockPosition = null;
      
      if (blockMesh.userData.block) {
        block = blockMesh.userData.block;
        blockPosition = { ...block.position }; // Create a copy to avoid reference issues
      } else if (blockMesh.userData.gridPosition) {
        blockPosition = { ...blockMesh.userData.gridPosition }; // Create a copy
      } else {
        console.log('No block data or grid position found on mesh');
        state.processingBlockAction = false;
        return;
      }
      
      // Don't allow breaking the control block
      if (block && block.type === 'control') {
        console.log('Cannot break control block - critical ship component');
        state.processingBlockAction = false;
        return;
      }
      
      // Store the mesh ID for cleanup validation
      const meshId = blockMesh.id;
      
      // Use the ship's breakBlock method to remove the block
      const brokenBlock = player.ship.breakBlock(blockPosition);
      
      if (brokenBlock) {
        // Add block to inventory
        addBlockToInventory(brokenBlock.type);
        console.log(`Successfully broke ${brokenBlock.type} block`);
        
        // Set the blocks changed flag
        blocksChanged = true;
        
        // Verify only one block was removed
        const finalBlockCount = player.ship.blocks.length;
        if (finalBlockCount !== initialBlockCount - 1) {
          console.warn(`Block count mismatch: ${initialBlockCount} -> ${finalBlockCount}`);
          // Attempt to clean up any duplicate removals
          player.ship.validateBlockCount();
        }
        
        // Double-check that the mesh was removed from the scene
        let meshStillExists = false;
        player.ship.group.children.forEach(child => {
          if (child.id === meshId) {
            meshStillExists = true;
            console.log('Mesh still exists after breaking block, removing manually');
            player.ship.group.remove(child);
          }
        });
      } else {
        console.log('Failed to break block at position', blockPosition);
      }
    } catch (error) {
      console.error('Error breaking block:', error);
    } finally {
      // Don't reset the processing flag here - it will be reset by the mouseup handler
    }
  }
  
  /**
   * Add a block to the inventory
   * @param {string} blockType - The type of block to add
   */
  function addBlockToInventory(blockType) {
    console.log(`Adding ${blockType} to inventory`);
    
    // Use the player's addToInventory method if available
    if (typeof player.addToInventory === 'function') {
      player.addToInventory({ type: blockType });
      console.log(`Used player.addToInventory to add ${blockType}`);
      return;
    }
    
    // Fallback implementation if player.addToInventory is not available
    // Find existing slot with this block type
    let slot = player.inventory.slots.find(slot => 
      slot && slot.type === blockType && (slot.count < 64 || !slot.count)
    );
    
    if (slot) {
      // Add to existing slot
      if (!slot.count) slot.count = 1;
      else slot.count++;
      console.log(`Added to existing slot, new count: ${slot.count}`);
    } else {
      // Find empty slot
      slot = player.inventory.slots.find(slot => !slot || !slot.type);
      
      if (slot) {
        // Add to empty slot
        if (!slot) {
          player.inventory.slots[player.inventory.slots.indexOf(null)] = { type: blockType, count: 1 };
        } else {
          slot.type = blockType;
          slot.count = 1;
        }
        console.log(`Added to empty slot: ${blockType}`);
      } else {
        console.log('Inventory full');
      }
    }
    
    // Update inventory UI if needed
    if (typeof player.updateInventoryUI === 'function') {
      player.updateInventoryUI();
    }
  }
  
  /**
   * Get the color for a block type
   * @param {string} blockType - The block type
   * @returns {number} The color as a hex value
   */
  function getBlockColor(blockType) {
    switch (blockType) {
      case 'wood':
        return 0x8B4513;
      case 'stone':
        return 0x808080;
      case 'lift':
        return 0xFFD700;
      case 'cannon':
        return 0x444444;
      case 'control':
        return 0x654321;
      default:
        return 0xFFFFFF;
    }
  }
  
  /**
   * Update the camera position
   */
  function updateCamera() {
    if (!state.active) return;
    
    // Set camera position to character's eye level
    state.camera.position.x = player.character.position.x;
    state.camera.position.y = player.character.position.y + state.cameraHeight;
    state.camera.position.z = player.character.position.z;
    
    // Set camera rotation
    state.camera.rotation.order = 'YXZ'; // This order is important for first-person controls
    state.camera.rotation.x = state.cameraRotation.x;
    state.camera.rotation.y = state.cameraRotation.y;
    state.camera.rotation.z = 0;
    
    // Update the camera's direction vectors to ensure they're current
    state.camera.updateProjectionMatrix();
    state.camera.updateMatrixWorld();
  }
  
  /**
   * Update the controller
   * @param {number} deltaTime - The time since the last update in seconds
   */
  function update(deltaTime) {
    if (!state.active) return;
    
    // Apply gravity
    player.character.velocity.y -= state.gravity * deltaTime;
    
    // Update position
    player.character.position.x += player.character.velocity.x * deltaTime;
    player.character.position.y += player.character.velocity.y * deltaTime;
    player.character.position.z += player.character.velocity.z * deltaTime;
    
    // Check for collisions with ship blocks
    if (player.ship) {
      checkCollisions();
    }
    
    // Update character mesh position
    player.character.mesh.position.set(
      player.character.position.x,
      player.character.position.y,
      player.character.position.z
    );
    
    // Update camera
    updateCamera();
  }
  
  /**
   * Check for collisions with ship blocks
   */
  function checkCollisions() {
    // Simple collision detection with ship blocks
    const characterBox = new THREE.Box3().setFromObject(player.character.mesh);
    
    // Check for ground collision
    if (player.character.position.y < 0) {
      player.character.position.y = 0;
      player.character.velocity.y = 0;
      player.character.isJumping = false;
    }
    
    // Check for collisions with ship blocks
    let onGround = false;
    
    player.ship.blocks.forEach(block => {
      // Skip blocks without meshes
      if (!block.mesh) return;
      
      // Get the collision box for this block using the improved method
      // This accounts for ship rotation properly
      const blockBox = block.getCollisionBox(player.ship);
      
      if (characterBox.intersectsBox(blockBox)) {
        // Determine which side of the block was hit
        const characterCenter = new THREE.Vector3(
          player.character.position.x,
          player.character.position.y + 0.9, // Center of character
          player.character.position.z
        );
        
        // Get the center of the block's collision box
        const blockCenter = new THREE.Vector3();
        blockBox.getCenter(blockCenter);
        
        const direction = new THREE.Vector3().subVectors(characterCenter, blockCenter);
        const distance = direction.length();
        direction.normalize();
        
        // Determine collision normal
        let normal = new THREE.Vector3(0, 0, 0);
        let penetration = 0;
        
        // Calculate the absolute differences in each axis
        const dx = Math.abs(characterCenter.x - blockCenter.x);
        const dy = Math.abs(characterCenter.y - blockCenter.y);
        const dz = Math.abs(characterCenter.z - blockCenter.z);
        
        // Get the block size (assuming 1x1x1 blocks)
        const blockSize = 1.0;
        const characterWidth = 0.6; // Character width/depth
        const characterHeight = 1.8; // Character height
        
        // Calculate penetration depths for each axis
        const penX = (blockSize/2 + characterWidth/2) - dx;
        const penY = (blockSize/2 + characterHeight/2) - dy;
        const penZ = (blockSize/2 + characterWidth/2) - dz;
        
        // Find the axis with the smallest penetration (this is the collision normal)
        if (penX <= penY && penX <= penZ) {
          // X-axis collision
          normal.set(characterCenter.x > blockCenter.x ? 1 : -1, 0, 0);
          penetration = penX;
        } else if (penY <= penX && penY <= penZ) {
          // Y-axis collision
          if (characterCenter.y > blockCenter.y) {
            // Bottom collision (player is above block)
            normal.set(0, 1, 0);
            penetration = penY;
            onGround = true;
            player.character.isJumping = false;
          } else {
            // Top collision (player is below block)
            normal.set(0, -1, 0);
            penetration = penY;
            player.character.velocity.y = 0;
          }
        } else {
          // Z-axis collision
          normal.set(0, 0, characterCenter.z > blockCenter.z ? 1 : -1);
          penetration = penZ;
        }
        
        // Resolve collision - only move the player, not the ship
        if (penetration > 0) {
          // Only apply position correction for the axis of collision
          // This prevents snapping to the top when bumping horizontally
          player.character.position.x += normal.x * penetration;
          
          // Only apply Y correction if it's a true vertical collision
          // This prevents snapping to the top when bumping horizontally
          if (normal.y !== 0) {
            player.character.position.y += normal.y * penetration;
          }
          
          player.character.position.z += normal.z * penetration;
          
          // Zero out velocity in the direction of the normal
          const dot = player.character.velocity.x * normal.x +
                      player.character.velocity.y * normal.y +
                      player.character.velocity.z * normal.z;
          
          if (dot < 0) {
            player.character.velocity.x -= normal.x * dot;
            player.character.velocity.y -= normal.y * dot;
            player.character.velocity.z -= normal.z * dot;
          }
        }
      }
    });
    
    return onGround;
  }
  
  return {
    activate,
    deactivate,
    handleInput,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    updateCamera,
    update,
    get active() {
      return state.active;
    },
    get player() {
      return state.player;
    },
    get camera() {
      return state.camera;
    },
    get cameraRotation() {
      return { ...state.cameraRotation };
    },
    get blocksChanged() { return blocksChanged; },
    set blocksChanged(value) { blocksChanged = value; }
  };
}

/**
 * Create a first-person camera for player mode
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {THREE.Camera} - The first-person camera
 */
export function createPlayerCamera(scene) {
  // Create camera
  const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near plane
    1000 // Far plane
  );
  
  // Set initial position
  camera.position.set(0, 1.6, 0);
  
  // Add to scene
  scene.add(camera);
  
  return camera;
}

/**
 * Create a crosshair for player mode that exactly mimics Minecraft's crosshair
 * @returns {Object} - The crosshair object
 */
export function createCrosshair() {
  console.log('Creating or updating crosshair to match Minecraft default');
  
  // First, remove any existing crosshair elements to avoid duplicates
  const existingCrosshair = document.getElementById('crosshair');
  if (existingCrosshair && existingCrosshair.parentNode) {
    console.log('Removing existing crosshair');
    existingCrosshair.parentNode.removeChild(existingCrosshair);
  }
  
  // Remove any existing container as well
  const existingContainer = document.getElementById('crosshair-container');
  if (existingContainer && existingContainer.parentNode) {
    console.log('Removing existing crosshair container');
    existingContainer.parentNode.removeChild(existingContainer);
  }
  
  // Create a special container for the crosshair
  const crosshairContainer = document.createElement('div');
  crosshairContainer.id = 'crosshair-container';
  
  // Apply critical styles to ensure it's on top of everything
  Object.assign(crosshairContainer.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '9999999', // Ultra high z-index
    overflow: 'visible'
  });
  
  // Create the crosshair
  const crosshair = document.createElement('div');
  crosshair.id = 'crosshair';
  
  // Style to match exactly Minecraft's default crosshair
  Object.assign(crosshair.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '15px', // More accurate Minecraft size
    height: '15px',
    pointerEvents: 'none',
    zIndex: '9999999',
    display: 'block',
    opacity: '1',
    visibility: 'visible',
    backgroundColor: 'transparent' // No background
  });
  
  // Create the Minecraft-style crosshair lines
  // Each line of the plus is separated with a 1px gap in the center (2px total gap)
  
  // Top vertical line
  const vTop = document.createElement('div');
  Object.assign(vTop.style, {
    position: 'absolute',
    width: '2px', // Thin line - exactly like Minecraft
    height: '4px', // Minecraft's exact length
    top: '0',
    left: '6.5px', // Perfect centering
    backgroundColor: '#ffffff', // Exact Minecraft color
    opacity: '0.8', // Minecraft's crosshair is slightly transparent
    boxShadow: '0 0 1px rgba(0, 0, 0, 0.5)' // Subtle shadow for visibility
  });
  crosshair.appendChild(vTop);
  
  // Bottom vertical line
  const vBottom = document.createElement('div');
  Object.assign(vBottom.style, {
    position: 'absolute',
    width: '2px', // Thin line
    height: '4px', // Minecraft's exact length
    bottom: '0',
    left: '6.5px', // Perfect centering
    backgroundColor: '#ffffff', // Exact Minecraft color
    opacity: '0.8', // Minecraft's crosshair is slightly transparent
    boxShadow: '0 0 1px rgba(0, 0, 0, 0.5)' // Subtle shadow for visibility
  });
  crosshair.appendChild(vBottom);
  
  // Left horizontal line
  const hLeft = document.createElement('div');
  Object.assign(hLeft.style, {
    position: 'absolute',
    width: '4px', // Minecraft's exact length
    height: '2px', // Thin line
    top: '6.5px', // Perfect centering
    left: '0',
    backgroundColor: '#ffffff', // Exact Minecraft color
    opacity: '0.8', // Minecraft's crosshair is slightly transparent
    boxShadow: '0 0 1px rgba(0, 0, 0, 0.5)' // Subtle shadow for visibility
  });
  crosshair.appendChild(hLeft);
  
  // Right horizontal line
  const hRight = document.createElement('div');
  Object.assign(hRight.style, {
    position: 'absolute',
    width: '4px', // Minecraft's exact length
    height: '2px', // Thin line
    top: '6.5px', // Perfect centering
    right: '0',
    backgroundColor: '#ffffff', // Exact Minecraft color
    opacity: '0.8', // Minecraft's crosshair is slightly transparent
    boxShadow: '0 0 1px rgba(0, 0, 0, 0.5)' // Subtle shadow for visibility
  });
  crosshair.appendChild(hRight);
  
  // Add the crosshair to the container
  crosshairContainer.appendChild(crosshair);
  
  // Add the container to the document as the very last element to ensure it's on top
  document.body.appendChild(crosshairContainer);
  
  console.log('Created new Minecraft-style crosshair');
  
  // Force a reflow to ensure the browser renders it
  crosshairContainer.getBoundingClientRect();
  
  // Crosshair object with methods
  const crosshairObj = {
    element: crosshair,
    container: crosshairContainer,
    
    /**
     * Show the crosshair
     */
    show() {
      console.log('Showing crosshair');
      this.container.style.display = 'block';
      this.element.style.display = 'block';
      this.element.style.opacity = '1';
      this.element.style.visibility = 'visible';
      
      // Force a reflow to make it appear immediately
      this.container.getBoundingClientRect();
      
      console.log('Crosshair SHOWN with styles:', {
        containerDisplay: this.container.style.display,
        elementDisplay: this.element.style.display,
        elementOpacity: this.element.style.opacity,
        elementVisibility: this.element.style.visibility
      });
    },
    
    /**
     * Hide the crosshair
     */
    hide() {
      console.log('Hiding crosshair');
      this.container.style.display = 'none';
    },
    
    /**
     * Update the crosshair
     * @param {String} mode - The current mode ('ship' or 'player')
     */
    update(mode) {
      console.log('Updating crosshair for mode:', mode);
      if (mode === 'player') {
        this.show();
      } else {
        this.hide();
      }
    },
    
    /**
     * Destroy the crosshair
     */
    destroy() {
      console.log('Destroying crosshair');
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  };
  
  return crosshairObj;
} 