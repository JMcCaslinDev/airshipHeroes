/**
 * Player Mode Module
 * 
 * Handles controls and camera for Player Mode.
 */

import * as THREE from 'three';
import {
  getPlayerMoveSpeed,
  integrateVertical,
  feetOnBlockTop,
  nearestBlockTopBelow,
  movePlayer,
  probeOnGround,
  MC_TICK,
  PLAYER_EYE_HEIGHT,
  PLAYER_SNEAK_EYE_HEIGHT,
  GROUND_SNAP_GAP
} from '../physics/playerMovement.js';
import {
  getShipLocalBlockBoxes,
  worldMovementToLocal,
  localFeetToWorld,
  getControlBlockFeetWorld
} from '../physics/shipLocalCollision.js';

/** Third-person: 1 block above eyes, ~1 block further back, wider FOV for full Steve. */
const THIRD_PERSON_BACK = 6;
const THIRD_PERSON_UP = 1;
const THIRD_PERSON_FOV = 78;
const THIRD_PERSON_LOOK_Y = 1;

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
    
    motionY: 0,
    jumpRequested: false,
    cameraView: 'first',
    cameraToggleLatch: false,
    defaultFov: 75,
    
    // Mouse button states to prevent multiple actions per click
    leftMouseDown: false,
    rightMouseDown: false,
    processingBlockAction: false,
    blockActionTimeout: null
  };
  
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
    
    state.defaultFov = state.camera.fov ?? 75;

    // Show character mesh only in third person
    if (player.character) {
      if (player.character.setFirstPersonView) {
        player.character.setFirstPersonView(state.cameraView === 'first');
      } else if (player.character.mesh) {
        player.character.mesh.visible = state.cameraView === 'third';
      }
    }
    
    // Position character on control block (ship-local grid → world)
    if (player.ship) {
      const feetWorld = getControlBlockFeetWorld(player.ship);
      if (feetWorld) {
        player.character.position.x = feetWorld.x;
        player.character.position.y = feetWorld.y;
        player.character.position.z = feetWorld.z;
        state.motionY = 0;

        if (player.character.mesh) {
          player.character.mesh.position.set(feetWorld.x, feetWorld.y, feetWorld.z);
        }
        console.log('Positioned player on control block:', player.character.position);
      } else {
        console.warn('No control block found on ship, using default position');
        player.character.position.x = player.ship.position.x;
        player.character.position.y = player.ship.position.y + 1.0;
        player.character.position.z = player.ship.position.z;
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
    
    // Request pointer lock for first-person view (main.js pointerLock manager)
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
    
    // Cancel any pending timeouts for processing block actions
    if (state.blockActionTimeout) {
      clearTimeout(state.blockActionTimeout);
      state.blockActionTimeout = null;
    }
    
    // Save ship if blocks were changed
    if (blocksChanged && player.shipStorage && player.username && player.ship) {
      try {
        const shipDefinition = player.ship.serialize();
        player.shipStorage.saveShip(player.username, shipDefinition, player.activeShipSlot);
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

    const sneaking = !!keys.down;
    const sprinting = !!keys.sprint && !sneaking;
    player.character.isSneaking = sneaking;

    const moveSpeed = getPlayerMoveSpeed({ sneaking, sprinting });
    
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
        finalDirection.normalize().multiplyScalar(moveSpeed);
        
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
    
    // Jump held state — applied in MC vertical ticks after ground probe
    state.jumpRequested = !!keys.up;

    if (keys.toggleCamera && !state.cameraToggleLatch) {
      state.cameraView = state.cameraView === 'first' ? 'third' : 'first';
      state.cameraToggleLatch = true;
      if (player.character?.setFirstPersonView) {
        player.character.setFirstPersonView(state.cameraView === 'first');
      }
    } else if (!keys.toggleCamera) {
      state.cameraToggleLatch = false;
    }
    
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
   * Sync player state used by BlockInteractions before a block action
   */
  function syncPlayerForBlockAction() {
    player.cameraRotation.x = state.cameraRotation.x;
    player.cameraRotation.y = state.cameraRotation.y;
    player.selectedBlock = player.inventory.getSelectedBlock();
    player.controls.blockInteractions.maxPlaceDistance = state.maxPlaceDistance;
  }

  /**
   * Delegate place/break to BlockInteractions (rotation-aware ship-local grid)
   * @param {'place'|'break'} action
   */
  function performBlockAction(action) {
    if (!player.controls?.blockInteractions) return false;
    syncPlayerForBlockAction();
    const blockInteractions = player.controls.blockInteractions;
    const success = action === 'break'
      ? blockInteractions.breakBlock()
      : blockInteractions.placeBlock();
    if (success) {
      blocksChanged = true;
    }
    return success;
  }

  /**
   * Handle mouse down
   * @param {MouseEvent} event - The mouse event
   */
  function handleMouseDown(event) {
    if (!state.active) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.button === 0) {
      if (!state.leftMouseDown && !state.processingBlockAction) {
        state.leftMouseDown = true;
        state.processingBlockAction = true;
        requestAnimationFrame(() => performBlockAction('break'));
      }
      return;
    }

    if (event.button === 2) {
      if (!state.rightMouseDown && !state.processingBlockAction) {
        state.rightMouseDown = true;
        state.processingBlockAction = true;
        requestAnimationFrame(() => performBlockAction('place'));
      }
    }
  }
  
  /**
   * Handle mouse up
   * @param {MouseEvent} event - The mouse event
   */
  function handleMouseUp(event) {
    console.log(`Mouse up event: button=${event.button}, active=${state.active}, leftMouseDown=${state.leftMouseDown}, rightMouseDown=${state.rightMouseDown}, processingBlockAction=${state.processingBlockAction}`);
    
    if (!state.active) {
      console.log("Player mode not active, ignoring mouse up");
      return;
    }
    
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
          console.log("Resetting processingBlockAction flag after left mouse up");
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
          console.log("Resetting processingBlockAction flag after right mouse up");
          state.processingBlockAction = false;
        }
      }, 100); // Shorter delay for better responsiveness
    }
  }
  
  
  function getBlockBoxes() {
    return getShipLocalBlockBoxes(player.ship);
  }

  function hasGroundSupport(worldX, worldY, worldZ) {
    const local = player.ship.transform.worldToLocalPosition({ x: worldX, y: worldY, z: worldZ });
    const boxes = getBlockBoxes();
    for (const box of boxes) {
      if (feetOnBlockTop(local.x, local.y, local.z, box)) {
        return true;
      }
    }
    return false;
  }

  function snapFeetToGround() {
    const world = player.character.position;
    const local = player.ship.transform.worldToLocalPosition(world);
    const topY = nearestBlockTopBelow(local.x, local.y, local.z, getBlockBoxes());
    if (topY !== null && Math.abs(local.y - topY) <= GROUND_SNAP_GAP && state.motionY <= 0) {
      const snapped = localFeetToWorld(player.ship, local.x, topY, local.z);
      player.character.position.y = snapped.y;
    }
  }

  function applyMovement(deltaTime) {
    if (!player.ship) {
      return;
    }

    const boxes = getBlockBoxes();
    const world = player.character.position;
    const sneaking = player.character.isSneaking;

    const localStart = player.ship.transform.worldToLocalPosition(world);
    const onGround = probeOnGround(localStart.x, localStart.y, localStart.z, boxes, sneaking)
      || (player.character.isOnGround && state.motionY <= 0);

    const vertical = integrateVertical(state.motionY, onGround, state.jumpRequested, deltaTime);
    state.motionY = vertical.motionY;

    let dx = player.character.velocity.x * deltaTime;
    let dz = player.character.velocity.z * deltaTime;
    const dy = vertical.deltaY;

    if (sneaking && (dx !== 0 || dz !== 0) && !hasGroundSupport(world.x + dx, world.y, world.z + dz)) {
      dx = 0;
      dz = 0;
    }

    const localMove = worldMovementToLocal(player.ship, world.x, world.y, world.z, dx, dy, dz);
    const moved = movePlayer(
      localMove.x,
      localMove.y,
      localMove.z,
      localMove.dx,
      localMove.dy,
      localMove.dz,
      boxes,
      sneaking
    );

    const feetWorld = localFeetToWorld(player.ship, moved.x, moved.y, moved.z);
    player.character.position.x = feetWorld.x;
    player.character.position.y = feetWorld.y;
    player.character.position.z = feetWorld.z;

    if (vertical.jumped) {
      player.character.isJumping = true;
      player.character.isOnGround = false;
    }

    const grounded = moved.onGround
      || probeOnGround(moved.x, moved.y, moved.z, boxes, sneaking);
    player.character.isOnGround = grounded && state.motionY <= 0;

    if (grounded) {
      player.character.isJumping = false;
      if (state.motionY < 0) {
        state.motionY = 0;
      }
    }
    if (moved.hitCeiling) {
      state.motionY = 0;
    }

    player.character.velocity.y = state.motionY / MC_TICK;

    if (state.motionY <= 0) {
      snapFeetToGround();
    }
  }

  /**
   * Update the camera position
   */
  function updateCamera() {
    if (!state.active) return;

    const eyeHeight = player.character.isSneaking ? PLAYER_SNEAK_EYE_HEIGHT : PLAYER_EYE_HEIGHT;
    const { x, y, z } = player.character.position;

    if (state.cameraView === 'third') {
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyEuler(new THREE.Euler(0, state.cameraRotation.y, 0, 'YXZ'));

      state.camera.fov = THIRD_PERSON_FOV;
      state.camera.position.set(
        x - forward.x * THIRD_PERSON_BACK,
        y + eyeHeight + THIRD_PERSON_UP,
        z - forward.z * THIRD_PERSON_BACK
      );

      state.camera.lookAt(x, y + THIRD_PERSON_LOOK_Y, z);
      state.camera.updateProjectionMatrix();
      state.camera.updateMatrixWorld();

      if (player.character?.setFirstPersonView) {
        player.character.setFirstPersonView(false);
      }
      return;
    }

    state.camera.fov = state.defaultFov;

    state.camera.position.x = x;
    state.camera.position.y = y + eyeHeight;
    state.camera.position.z = z;

    state.camera.rotation.order = 'YXZ';
    state.camera.rotation.x = state.cameraRotation.x;
    state.camera.rotation.y = state.cameraRotation.y;
    state.camera.rotation.z = 0;

    if (player.character?.setFirstPersonView) {
      player.character.setFirstPersonView(true);
    }

    state.camera.updateProjectionMatrix();
    state.camera.updateMatrixWorld();
  }
  
  function update(deltaTime) {
    if (!state.active) return;

    applyMovement(deltaTime);

    if (player.ship?.transform) {
      const local = player.ship.transform.worldToLocalPosition(player.character.position);
      if (local.y < -2) {
        const feetWorld = getControlBlockFeetWorld(player.ship);
        if (feetWorld) {
          player.character.position.x = feetWorld.x;
          player.character.position.y = feetWorld.y;
          player.character.position.z = feetWorld.z;
          state.motionY = 0;
          player.character.velocity.y = 0;
          player.character.isJumping = false;
          player.character.isOnGround = true;
        }
      }
    }

    player.character.mesh.position.set(
      player.character.position.x,
      player.character.position.y,
      player.character.position.z
    );

    updateCamera();
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
      this.show();
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