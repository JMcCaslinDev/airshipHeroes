/**
 * Player Class
 * 
 * Manages player-specific functionality, including:
 * - Player information (username, kills, deaths)
 * - Inventory management
 * - Control modes (Ship Mode and Player Mode)
 * - Input handling
 */

import * as THREE from 'three';
import Ship from './ship.js';
import BlockFactory from '../blocks/blockFactory.js';

class Player {
  /**
   * Constructor for the Player class
   * @param {Object} options - Options for the player
   */
  constructor(options = {}) {
    this.username = options.username || 'Player';
    this.kills = 0;
    this.deaths = 0;
    this.ship = null;
    this.mode = 'ship'; // 'ship' or 'player'
    this.shipStorage = options.shipStorage || null;
    
    // Player character (for Player Mode)
    this.character = {
      height: 2, // 2 blocks tall
      width: 0.6, // 0.6 blocks wide
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0,
      isSneaking: false,
      isJumping: false,
      mesh: null
    };
    
    // Camera
    this.camera = options.camera || null;
    this.cameraRotation = { x: 0, y: 0 };
    
    // Inventory
    this.inventory = {
      slots: Array(9).fill(null),
      selectedSlot: 0,
      maxStackSize: 999,
      infiniteBlocks: true
    };
    
    // Controls state
    this.controls = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      sneak: false,
      fire: false
    };
    
    // Block placement
    this.maxPlaceDistance = 5; // Maximum distance to place blocks (in Player Mode)
    this.selectedBlock = null; // Currently selected block type for placement
    
    // UI elements
    this.uiElements = {
      inventory: null,
      modeIndicator: null,
      stats: null
    };
  }

  /**
   * Initialize the player
   * @param {THREE.Scene} scene - The Three.js scene
   * @param {THREE.Camera} camera - The Three.js camera
   */
  init(scene, camera) {
    this.camera = camera;
    
    // Create player character mesh (for Player Mode)
    this.createCharacterMesh(scene);
    
    // Create a new ship for the player
    this.ship = new Ship({
      owner: this,
      position: { x: 0, y: 100, z: 0 }
    });
    
    // Get UI elements
    this.uiElements.inventory = document.getElementById('inventory');
    this.uiElements.modeIndicator = document.getElementById('mode-indicator');
    this.uiElements.stats = document.getElementById('fps-counter'); // Using fps-counter as stats for now
    
    // Try to load inventory from local storage, or initialize with defaults if not available
    if (!this.loadInventory()) {
      this.initializeInventory();
    }
    
    // Select the first inventory slot by default
    this.selectInventorySlot(0);
    
    // Update UI
    this.updateUI();
    
    // Set up event listeners for controls
    this.setupEventListeners();
    
    console.log('Player initialized with inventory:', this.inventory);
  }

  /**
   * Create the player character mesh (for Player Mode)
   * @param {THREE.Scene} scene - The Three.js scene
   */
  createCharacterMesh(scene) {
    try {
      // Check if scene is provided
      if (!scene) {
        console.error('Scene is undefined in createCharacterMesh');
        return;
      }
      
      // Create a simple capsule for the player character
      const geometry = new THREE.CapsuleGeometry(0.3, 1.4, 4, 8);
      const material = new THREE.MeshStandardMaterial({ color: 0x0000ff }); // Blue
      
      this.character.mesh = new THREE.Mesh(geometry, material);
      this.character.mesh.castShadow = true;
      
      // Position at the center of the ship initially
      if (this.ship) {
        this.character.position = { ...this.ship.position };
        this.character.position.y += 1; // Stand on top of the ship
      }
      
      this.character.mesh.position.set(
        this.character.position.x,
        this.character.position.y,
        this.character.position.z
      );
      
      // Add to scene
      scene.add(this.character.mesh);
      
      // Hide initially (start in Ship Mode)
      this.character.mesh.visible = false;
      
      console.log('Character mesh created successfully');
    } catch (error) {
      console.error('Error creating character mesh:', error);
    }
  }

  /**
   * Set up event listeners for keyboard and mouse controls
   */
  setupEventListeners() {
    console.log("Setting up event listeners for player controls");
    
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      // Check for number keys (1-9) for inventory selection - ONLY in player mode
      if (event.key >= '1' && event.key <= '9' && this.mode === 'player') {
        const slotIndex = parseInt(event.key) - 1;
        console.log(`Number key ${event.key} pressed, selecting inventory slot ${slotIndex + 1}`);
        this.selectInventorySlot(slotIndex);
        return; // Don't prevent default to allow other handlers
      }
      
      this.handleKeyDown(event);
    });
    
    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event);
    });
    
    // Mouse controls
    document.addEventListener('mousemove', (event) => {
      this.handleMouseMove(event);
    });
    
    document.addEventListener('mousedown', (event) => {
      this.handleMouseDown(event);
    });
    
    document.addEventListener('mouseup', (event) => {
      this.handleMouseUp(event);
    });
    
    // Prevent context menu on right-click
    document.addEventListener('contextmenu', (event) => {
      console.log("Context menu prevented");
      event.preventDefault();
      return false;
    });
    
    // Request pointer lock when clicking on the canvas in Player Mode
    document.addEventListener('click', () => {
      if (this.mode === 'player' && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    });
    
    // Add click handlers for inventory slots
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    inventorySlots.forEach((slot, index) => {
      slot.addEventListener('click', () => {
        console.log(`Clicked inventory slot ${index + 1}`);
        this.selectInventorySlot(index);
      });
    });
    
    console.log("Event listeners set up successfully");
  }

  /**
   * Handle key down events
   * @param {KeyboardEvent} event - The key event
   */
  handleKeyDown(event) {
    // Log all key presses in player mode for debugging
    if (this.mode === 'player') {
      console.log(`Key pressed: ${event.key} (keyCode: ${event.keyCode})`);
    }
    
    switch (event.key.toLowerCase()) {
      // Movement controls (both modes)
      case 'w':
        this.controls.forward = true;
        break;
      case 's':
        this.controls.backward = true;
        break;
      case 'a':
        this.controls.left = true;
        break;
      case 'd':
        this.controls.right = true;
        break;
        
      // Ship Mode specific controls
      case 'q':
        if (this.mode === 'ship') this.controls.up = true;
        break;
      case 'e':
        if (this.mode === 'ship') this.controls.down = true;
        break;
        
      // Player Mode specific controls
      case ' ':
        if (this.mode === 'player') this.controls.jump = true;
        break;
      case 'x':
        if (this.mode === 'player') this.controls.sneak = true;
        break;
        
      // Mode switching
      case 'b':
        this.toggleMode();
        break;
        
      // Inventory selection (only in player mode)
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        if (this.mode === 'player') {
          const slotIndex = parseInt(event.key) - 1;
          console.log(`Number key ${event.key} pressed - selecting inventory slot ${slotIndex + 1}`);
          this.selectInventorySlot(slotIndex);
        } else {
          console.log(`Ignoring number key ${event.key} in ship mode`);
        }
        break;
        
      // Fire cannons
      case 'r':
        this.controls.fire = true;
        break;
    }
  }

  /**
   * Handle keyup events
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyUp(event) {
    switch (event.key.toLowerCase()) {
      // Movement controls (both modes)
      case 'w':
        this.controls.forward = false;
        break;
      case 's':
        this.controls.backward = false;
        break;
      case 'a':
        this.controls.left = false;
        break;
      case 'd':
        this.controls.right = false;
        break;
        
      // Ship Mode specific controls
      case 'q':
        this.controls.up = false;
        break;
      case 'e':
        this.controls.down = false;
        break;
        
      // Player Mode specific controls
      case ' ':
        this.controls.jump = false;
        break;
      case 'x':
        this.controls.sneak = false;
        break;
        
      // Fire cannons
      case 'r':
        this.controls.fire = false;
        break;
    }
  }

  /**
   * Handle mouse movement
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseMove(event) {
    if (this.mode === 'player' && document.pointerLockElement) {
      // Player Mode - First-person camera rotation
      const sensitivity = 0.002;
      this.cameraRotation.y -= event.movementX * sensitivity;
      this.cameraRotation.x -= event.movementY * sensitivity;
      
      // Limit vertical rotation to prevent flipping
      this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));
      
      // Update character rotation
      this.character.rotation = this.cameraRotation.y;
    } else if (this.mode === 'ship') {
      // Ship Mode - Orbit camera (handled elsewhere)
    }
  }

  /**
   * Handle mouse down events
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseDown(event) {
    console.log("Mouse down event", {
      button: event.button,
      mode: this.mode,
      selectedSlot: this.inventory.selectedSlot,
      selectedBlock: this.selectedBlock
    });
    
    // Prevent default behavior for right-click
    if (event.button === 2) {
      event.preventDefault();
    }
    
    if (this.mode === 'player') {
      if (event.button === 0) {
        // Left click - Break block
        console.log("Left click - Breaking block");
        this.breakBlock();
      } else if (event.button === 2) {
        // Right click - Place block
        console.log("Right click - Placing block", {
          selectedSlot: this.inventory.selectedSlot,
          selectedBlock: this.selectedBlock
        });
        this.placeBlock();
      }
    }
    
    return false; // Prevent default
  }

  /**
   * Handle mouse up events
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseUp(event) {
    // Handle mouse up events if needed
  }

  /**
   * Toggle between Ship Mode and Player Mode
   */
  toggleMode() {
    if (this.mode === 'ship') {
      // Switch to Player Mode
      this.mode = 'player';
      
      // Show player character
      if (this.character.mesh) {
        this.character.mesh.visible = true;
      }
      
      // Position character on the ship
      if (this.ship && this.ship.steeringWheel) {
        const wheelPos = this.ship.getBlockWorldPosition(this.ship.steeringWheel);
        this.character.position = { ...wheelPos };
        this.character.position.y += 1; // Stand on top of the steering wheel
        
        if (this.character.mesh) {
          this.character.mesh.position.set(
            this.character.position.x,
            this.character.position.y,
            this.character.position.z
          );
        }
      }
      
      // Reset inventory selection to first slot when entering player mode
      this.inventory.selectedSlot = 0;
      
      // Update inventory UI to reflect the selection
      const inventoryElement = document.getElementById('inventory');
      if (inventoryElement) {
        const slots = inventoryElement.querySelectorAll('.inventory-slot');
        slots.forEach((slot, index) => {
          slot.classList.toggle('selected', index === 0);
        });
      }
      
      // Request pointer lock for first-person view
      document.body.requestPointerLock();
    } else {
      // Switch to Ship Mode
      this.mode = 'ship';
      
      // Hide player character
      if (this.character.mesh) {
        this.character.mesh.visible = false;
      }
      
      // Exit pointer lock
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
    
    // Update UI
    this.updateUI();
  }

  /**
   * Select an inventory slot
   * @param {number} slotIndex - The index of the slot to select (0-8)
   */
  selectInventorySlot(slotIndex) {
    // Only allow inventory selection in player mode
    if (this.mode !== 'player') {
      console.log(`Cannot select inventory slot in ${this.mode} mode`);
      return;
    }
    
    console.log(`Selecting inventory slot ${slotIndex + 1}`);
    
    // Validate slot index
    if (slotIndex < 0 || slotIndex >= this.inventory.slots.length) {
      console.error(`Invalid slot index: ${slotIndex}`);
      return;
    }
    
    // Update selected slot
    const previousSlot = this.inventory.selectedSlot;
    this.inventory.selectedSlot = slotIndex;
    console.log(`Changed selected slot from ${previousSlot + 1} to ${slotIndex + 1}`);
    
    // Update selected block based on the slot content
    const slotContent = this.inventory.slots[slotIndex];
    if (slotContent) {
      this.selectedBlock = { 
        type: slotContent.type, 
        count: slotContent.count 
      };
      console.log(`Selected block: ${this.selectedBlock.type} (${this.selectedBlock.count})`);
    } else {
      this.selectedBlock = null;
      console.log("Selected slot is empty");
    }
    
    // Force a complete UI update to ensure the selection is properly displayed
    this.updateInventoryUI();
    
    // Save inventory state
    this.saveInventory();
  }
  
  /**
   * Update the UI to reflect the newly selected slot without recreating the entire inventory UI
   * @param {Number} previousSlot - The previously selected slot index
   * @param {Number} newSlot - The newly selected slot index
   */
  updateSelectedSlotUI(previousSlot, newSlot) {
    console.log(`Updating selected slot UI: ${previousSlot + 1} -> ${newSlot + 1}`);
    
    // Get the inventory container
    const inventoryContainer = document.getElementById('inventory');
    if (!inventoryContainer) {
      console.error("Inventory container not found");
      return;
    }
    
    // Get all inventory slots
    const slots = inventoryContainer.querySelectorAll('.inventory-slot');
    
    if (slots.length === 0) {
      console.log("No inventory slots found, recreating entire UI");
      this.updateInventoryUI();
      return;
    }
    
    console.log(`Found ${slots.length} inventory slots`);
    
    // Debug: log all slots and their dataset values
    slots.forEach((slot, index) => {
      console.log(`Slot ${index + 1} dataset: ${slot.dataset.slot}, has selected class: ${slot.classList.contains('selected')}`);
    });
    
    // Remove 'selected' class from all slots first
    slots.forEach(slot => {
      if (slot.classList.contains('selected')) {
        slot.classList.remove('selected');
        console.log(`Removed 'selected' class from slot with dataset ${slot.dataset.slot}`);
      }
    });
    
    // Add 'selected' class to the newly selected slot
    // Find the slot with the matching dataset.slot value
    let found = false;
    slots.forEach(slot => {
      if (parseInt(slot.dataset.slot) === newSlot) {
        slot.classList.add('selected');
        console.log(`Added 'selected' class to slot with dataset ${slot.dataset.slot}`);
        found = true;
      }
    });
    
    if (!found) {
      console.error(`Could not find slot with dataset.slot = ${newSlot}`);
      // Fallback: try to use the index directly
      if (newSlot >= 0 && newSlot < slots.length) {
        slots[newSlot].classList.add('selected');
        console.log(`Added 'selected' class to slot at index ${newSlot}`);
      } else {
        console.error(`Invalid new slot index: ${newSlot}`);
      }
    }
  }

  /**
   * Add an item to the inventory
   * @param {Object} item - The item to add
   * @returns {Boolean} - Whether the item was successfully added
   */
  addToInventory(item) {
    // Find an existing stack of the same type that isn't full
    for (let i = 0; i < this.inventory.slots.length; i++) {
      const slot = this.inventory.slots[i];
      
      if (slot && slot.type === item.type && slot.count < this.inventory.maxStackSize) {
        // Add to existing stack
        slot.count++;
        this.updateInventoryUI();
        this.saveInventory(); // Save inventory state
        return true;
      }
    }
    
    // Find an empty slot
    for (let i = 0; i < this.inventory.slots.length; i++) {
      if (!this.inventory.slots[i]) {
        // Add to empty slot
        this.inventory.slots[i] = {
          type: item.type,
          count: 1
        };
        this.updateInventoryUI();
        this.saveInventory(); // Save inventory state
        return true;
      }
    }
    
    // Inventory is full
    return false;
  }

  /**
   * Remove an item from the inventory
   * @param {Number} slotIndex - The index of the slot to remove from
   * @param {Number} count - The number of items to remove
   * @returns {Boolean} - Whether the items were successfully removed
   */
  removeFromInventory(slotIndex, count = 1) {
    if (slotIndex >= 0 && slotIndex < this.inventory.slots.length) {
      const slot = this.inventory.slots[slotIndex];
      
      if (slot) {
        // If infinite blocks is enabled, don't actually reduce the count
        if (!this.inventory.infiniteBlocks) {
          // Remove items
          slot.count -= count;
          
          // Remove slot if empty
          if (slot.count <= 0) {
            this.inventory.slots[slotIndex] = null;
          }
        }
        
        this.updateInventoryUI();
        this.saveInventory(); // Save inventory state
        return true;
      }
    }
    
    return false;
  }

  /**
   * Initialize the player's inventory with default blocks
   */
  initializeInventory() {
    // Add some default blocks to the inventory
    const defaultBlocks = [
      { type: 'wood', count: 999 },
      { type: 'stone', count: 999 },
      { type: 'lift', count: 999 },
      { type: 'cannon', count: 999 },
      { type: 'control', count: 999 }
    ];
    
    // Add each block type to the inventory
    defaultBlocks.forEach((block, index) => {
      if (index < this.inventory.slots.length) {
        this.inventory.slots[index] = block;
      } else {
        // If we have more block types than slots, just add them to the inventory
        this.addToInventory(block);
      }
    });
    
    // Update the UI
    this.updateInventoryUI();
  }

  /**
   * Break a block in the world
   */
  breakBlock() {
    console.log("breakBlock called", {
      mode: this.mode,
      selectedSlot: this.inventory.selectedSlot
    });
    
    // Only allow block breaking in player mode
    if (this.mode !== 'player') {
      console.log("Cannot break blocks in ship mode");
      return;
    }
    
    // Get eye position (camera position)
    const eyePosition = new THREE.Vector3(
      this.character.position.x,
      this.character.position.y + 1.6, // Eye level
      this.character.position.z
    );
    
    // Get look direction
    const lookDirection = new THREE.Vector3(0, 0, -1);
    lookDirection.applyEuler(new THREE.Euler(
      this.cameraRotation.x,
      this.cameraRotation.y,
      0,
      'YXZ'
    ));
    lookDirection.normalize();
    
    console.log("Eye position:", eyePosition);
    console.log("Look direction:", lookDirection);
    
    // Cast ray to find block to break
    const raycaster = new THREE.Raycaster(eyePosition, lookDirection);
    raycaster.far = this.maxPlaceDistance;
    
    // Check for intersection with the ship
    if (this.ship && this.ship.blocks.length > 0) {
      // Get all block meshes from the ship
      const blockMeshes = [];
      this.ship.group.traverse(child => {
        if (child.isMesh && child.userData.isBlock) {
          blockMeshes.push(child);
        }
      });
      
      console.log(`Found ${blockMeshes.length} block meshes to check for intersection`);
      
      // Check for intersection with block meshes
      const intersects = raycaster.intersectObjects(blockMeshes, false);
      
      if (intersects.length > 0) {
        // Get the first intersection
        const intersection = intersects[0];
        console.log("Intersection found at distance:", intersection.distance);
        
        // Check if the intersection is within the maximum distance
        if (intersection.distance <= this.maxPlaceDistance) {
          // Get the block from the mesh
          const mesh = intersection.object;
          
          // Get the intersection point in world coordinates
          const intersectionPoint = intersection.point.clone();
          console.log("Intersection point (world):", intersectionPoint);
          
          // First try to get the block from the mesh's userData
          let block = mesh.userData.block;
          
          if (block) {
            console.log(`Found block of type: ${block.type} at position:`, block.position);
            
            // Store block type before removal
            const blockType = block.type;
            
            // Try to remove the block from the ship
            const removed = this.ship.removeBlock(block.position);
            
            if (removed) {
              console.log("Block successfully removed from ship");
              
              // Add to inventory
              this.addToInventory({ type: blockType });
              
              // Save ship to localStorage if shipStorage is available
              if (this.shipStorage && this.username) {
                try {
                  const shipDefinition = this.ship.serialize();
                  this.shipStorage.saveShip(this.username, shipDefinition);
                  console.log("Ship saved to localStorage after block removal");
                } catch (error) {
                  console.error("Error saving ship to localStorage:", error);
                }
              }
              
              // Also save the inventory state
              this.saveInventory();
            } else {
              console.log("Block could not be removed (might be a critical block)");
            }
          } else {
            console.error("No block data found on mesh");
            
            // Try to find the block by world position
            // Convert the intersection point to ship-local coordinates
            const localPos = this.ship.worldToLocalPosition({
              x: intersectionPoint.x,
              y: intersectionPoint.y,
              z: intersectionPoint.z
            });
            
            console.log("Intersection point (local):", localPos);
            
            // Find the block at this position
            const blockAtPosition = this.ship.getBlockAtLocalPosition(localPos);
            
            if (blockAtPosition) {
              console.log(`Found block by position: ${blockAtPosition.type} at local position:`, blockAtPosition.position);
              
              // Store block type before removal
              const blockType = blockAtPosition.type;
              
              // Try to remove the block from the ship
              const removed = this.ship.removeBlock(blockAtPosition.position);
              
              if (removed) {
                console.log("Block successfully removed by position");
                
                // Add to inventory
                this.addToInventory({ type: blockType });
                
                // Save ship and inventory
                if (this.shipStorage && this.username) {
                  try {
                    const shipDefinition = this.ship.serialize();
                    this.shipStorage.saveShip(this.username, shipDefinition);
                  } catch (error) {
                    console.error("Error saving ship to localStorage:", error);
                  }
                }
                this.saveInventory();
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
    this.validateShipBlocks();
    
    // Clean up the ship to remove any ghost blocks
    this.cleanupShip();
  }

  /**
   * Place a block in the world
   */
  placeBlock() {
    console.log("placeBlock called", {
      mode: this.mode,
      selectedSlot: this.inventory.selectedSlot,
      inventory: this.inventory.slots
    });
    
    // Only allow block placement in player mode
    if (this.mode !== 'player') {
      console.log("Cannot place blocks in ship mode");
      return;
    }
    
    // Check if we have a selected block
    if (!this.selectedBlock) {
      // Try to select a block from the current slot
      const currentSlot = this.inventory.slots[this.inventory.selectedSlot];
      if (currentSlot) {
        this.selectedBlock = { type: currentSlot.type, count: currentSlot.count };
        console.log(`Selected block from current slot: ${this.selectedBlock.type}`);
      } else {
        console.log("No block selected, trying to find a non-empty slot");
        for (let i = 0; i < this.inventory.slots.length; i++) {
          if (this.inventory.slots[i]) {
            this.selectInventorySlot(i);
            this.selectedBlock = { type: this.inventory.slots[i].type, count: this.inventory.slots[i].count };
            console.log(`Auto-selected slot ${i + 1} with ${this.selectedBlock?.type || 'none'}`);
            break;
          }
        }
      }
      
      // Still no block selected? Can't place anything
      if (!this.selectedBlock) {
        console.log("No blocks in inventory to place");
        return;
      }
    }
    
    console.log(`Placing block of type: ${this.selectedBlock.type}`);
    
    // Get eye position (camera position)
    const eyePosition = new THREE.Vector3(
      this.character.position.x,
      this.character.position.y + 1.6, // Eye level
      this.character.position.z
    );
    
    // Get look direction from camera
    const lookDirection = new THREE.Vector3(0, 0, -1);
    lookDirection.applyEuler(new THREE.Euler(
      this.cameraRotation.x,
      this.cameraRotation.y,
      0,
      'YXZ'
    ));
    lookDirection.normalize();
    
    console.log("Eye position:", eyePosition);
    console.log("Look direction:", lookDirection);
    
    // Cast ray to find placement position
    const raycaster = new THREE.Raycaster(eyePosition, lookDirection);
    raycaster.far = this.maxPlaceDistance; // Limit ray distance to max placement distance
    
    // Check for intersection with existing blocks
    let placementPos = null;
    
    // First, check for intersection with the ship
    if (this.ship && this.ship.blocks.length > 0) {
      // Get all block meshes from the ship
      const blockMeshes = [];
      this.ship.group.traverse(child => {
        if (child.isMesh && child.userData.isBlock) {
          blockMeshes.push(child);
        }
      });
      
      console.log(`Found ${blockMeshes.length} block meshes to check for intersection`);
      
      // Check for intersection with block meshes
      const intersects = raycaster.intersectObjects(blockMeshes, false);
      
      if (intersects.length > 0) {
        // Get the first intersection
        const intersection = intersects[0];
        console.log("Intersection found at distance:", intersection.distance);
        
        // Check if the intersection is within the maximum placement distance
        if (intersection.distance <= this.maxPlaceDistance) {
          try {
            // Get the block that was hit
            const hitBlockData = intersection.object.userData.block;
            
            if (!hitBlockData) {
              console.warn("No block data found in the hit object's userData");
              return;
            }
            
            console.log("Hit block data:", hitBlockData);
            
            // Get the face normal in local space
            const faceNormal = intersection.face.normal.clone();
            
            // Transform the normal to world space
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
            const worldNormal = faceNormal.clone().applyMatrix3(normalMatrix).normalize();
            
            console.log("Face normal (local):", faceNormal);
            console.log("Face normal (world):", worldNormal);
            
            // Convert world normal to ship space by applying inverse ship rotation
            const shipRotationY = this.ship.rotation;
            const rotationMatrix = new THREE.Matrix4().makeRotationY(-shipRotationY);
            const shipSpaceNormal = worldNormal.clone().applyMatrix4(rotationMatrix);
            
            console.log("Ship space normal:", shipSpaceNormal);
            
            // Round to get the direction in grid space
            // We need to be careful with rounding to ensure we get a valid direction
            let direction = {
              x: 0,
              y: 0,
              z: 0
            };
            
            // Find the dominant axis
            const absX = Math.abs(shipSpaceNormal.x);
            const absY = Math.abs(shipSpaceNormal.y);
            const absZ = Math.abs(shipSpaceNormal.z);
            
            if (absX >= absY && absX >= absZ) {
              direction.x = Math.sign(shipSpaceNormal.x);
            } else if (absY >= absX && absY >= absZ) {
              direction.y = Math.sign(shipSpaceNormal.y);
            } else {
              direction.z = Math.sign(shipSpaceNormal.z);
            }
            
            console.log("Direction for new block:", direction);
            
            // Calculate the grid position for the new block
            const newBlockGridPos = {
              x: hitBlockData.position.x + direction.x,
              y: hitBlockData.position.y + direction.y,
              z: hitBlockData.position.z + direction.z
            };
            
            console.log("Hit block grid position:", hitBlockData.position);
            console.log("New block grid position:", newBlockGridPos);
            
            // Check if there's already a block at this position using the ship's helper method
            const existingBlock = this.ship.getBlockAtLocalPosition(newBlockGridPos);

            if (existingBlock) {
              console.log("Block already exists at this position");
              return;
            }
            
            // Also check for any orphaned meshes at this position
            let orphanedMeshFound = false;
            this.ship.group.traverse(child => {
              if (child.isMesh && child.userData.isBlock) {
                // Get the local position in ship coordinates
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                
                const localPos = this.ship.worldToLocalPosition({
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
                
                if (meshGridPos.x === newBlockGridPos.x && 
                    meshGridPos.y === newBlockGridPos.y && 
                    meshGridPos.z === newBlockGridPos.z) {
                  console.log("Found orphaned mesh at target position, removing it");
                  if (child.parent) {
                    child.parent.remove(child);
                  }
                  orphanedMeshFound = true;
                }
              }
            });
            
            if (orphanedMeshFound) {
              console.log("Cleaned up orphaned mesh before placing new block");
            }
            
            // Remove from inventory
            const removed = this.removeFromInventory(this.inventory.selectedSlot);
            
            if (removed) {
              // Use BlockFactory to create the new block for consistency
              const newBlock = BlockFactory.createBlock(
                this.selectedBlock.type,
                { ...newBlockGridPos },
                { rotation: 0 } // Add any additional options here
              );
              
              if (!newBlock) {
                console.error("Failed to create new block using BlockFactory");
                // Add the item back to inventory since creation failed
                this.addToInventory({ type: this.selectedBlock.type });
                return;
              }
              
              console.log(`Created new block of type: ${newBlock.type} at position:`, newBlock.position);
              
              // Get the resource loader
              let resourceLoader = window.resourceLoader;
              
              // If window.resourceLoader is not available, use a simple fallback
              if (!resourceLoader) {
                console.warn("Resource loader not found on window object, using fallback");
                
                // Create a simple fallback texture loader that matches the expected interface
                resourceLoader = {
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
              
              // Create the mesh before adding to the ship
              newBlock.createMesh(this.ship.group, resourceLoader);
              
              // Add to ship's blocks array
              this.ship.blocks.push(newBlock);
              
              console.log("Block added to ship");
              
              // Force update the ship's group to ensure the new block is visible
              this.ship.group.updateMatrixWorld(true);
              
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
              
              // Save ship to localStorage if shipStorage is available
              if (this.shipStorage && this.username) {
                try {
                  const shipDefinition = this.ship.serialize();
                  this.shipStorage.saveShip(this.username, shipDefinition);
                  console.log("Ship saved to localStorage");
                } catch (error) {
                  console.error("Error saving ship to localStorage:", error);
                }
              }
              
              // Also save the inventory state
              this.saveInventory();
            } else {
              console.error("Failed to remove block from inventory");
            }
          } catch (error) {
            console.error("Error calculating block placement:", error);
            return;
          }
        } else {
          console.log(`Intersection too far (${intersection.distance} > ${this.maxPlaceDistance})`);
          return;
        }
      } else {
        console.log("No direct intersection found, trying to place block in air");
        
        // No intersection found, place block in air at a fixed distance
        placementPos = new THREE.Vector3().copy(eyePosition).add(
          lookDirection.clone().multiplyScalar(Math.min(3, this.maxPlaceDistance))
        );
        
        console.log("Placing block in air at position:", placementPos);
        
        // Round to grid position
        placementPos.x = Math.round(placementPos.x);
        placementPos.y = Math.round(placementPos.y);
        placementPos.z = Math.round(placementPos.z);
        
        // Convert to grid position relative to ship
        const gridPos = {
          x: Math.round(placementPos.x - this.ship.position.x),
          y: Math.round(placementPos.y - this.ship.position.y),
          z: Math.round(placementPos.z - this.ship.position.z)
        };
        
        console.log("Attempting to place block at grid position:", gridPos);
        
        // Check if position is within placement range
        const distance = eyePosition.distanceTo(new THREE.Vector3(
          gridPos.x + this.ship.position.x,
          gridPos.y + this.ship.position.y,
          gridPos.z + this.ship.position.z
        ));
        
        console.log("Distance to placement position:", distance, "max:", this.maxPlaceDistance);
        
        if (distance <= this.maxPlaceDistance) {
          // Check if there's already a block at this position
          const existingBlock = this.ship.blocks.find(block => 
            block.position.x === gridPos.x &&
            block.position.y === gridPos.y &&
            block.position.z === gridPos.z
          );
          
          if (!existingBlock) {
            console.log(`Placing ${this.selectedBlock.type} block at position:`, gridPos);
            
            // Remove from inventory
            const removed = this.removeFromInventory(this.inventory.selectedSlot);
            
            if (removed) {
              // Use BlockFactory to create the new block for consistency
              const newBlock = BlockFactory.createBlock(
                this.selectedBlock.type,
                { ...gridPos },
                { rotation: 0 } // Add any additional options here
              );
              
              if (!newBlock) {
                console.error("Failed to create new block using BlockFactory");
                // Add the item back to inventory since creation failed
                this.addToInventory({ type: this.selectedBlock.type });
                return;
              }
              
              console.log(`Created new block of type: ${newBlock.type} at position:`, newBlock.position);
              
              // Get the resource loader
              let resourceLoader = window.resourceLoader;
              
              // If window.resourceLoader is not available, use a simple fallback
              if (!resourceLoader) {
                console.warn("Resource loader not found on window object, using fallback");
                
                // Create a simple fallback texture loader that matches the expected interface
                resourceLoader = {
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
              
              // Create the mesh before adding to the ship
              newBlock.createMesh(this.ship.group, resourceLoader);
              
              // Add to ship's blocks array
              this.ship.blocks.push(newBlock);
              
              console.log("Block added to ship");
              
              // Force update the ship's group to ensure the new block is visible
              this.ship.group.updateMatrixWorld(true);
              
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
              
              // Save ship to localStorage if shipStorage is available
              if (this.shipStorage && this.username) {
                try {
                  const shipDefinition = this.ship.serialize();
                  this.shipStorage.saveShip(this.username, shipDefinition);
                  console.log("Ship saved to localStorage");
                } catch (error) {
                  console.error("Error saving ship to localStorage:", error);
                }
              }
              
              // Also save the inventory state
              this.saveInventory();
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
    } else if (this.ship) {
      // No blocks in ship yet, place the first block at a distance in front of the player
      placementPos = new THREE.Vector3().copy(eyePosition).add(
        lookDirection.clone().multiplyScalar(2) // Place 2 units in front of player
      );
      
      console.log("Placing first block at position:", placementPos);
      
      // Round to grid position
      placementPos.x = Math.round(placementPos.x);
      placementPos.y = Math.round(placementPos.y);
      placementPos.z = Math.round(placementPos.z);
      
      // Convert to grid position relative to ship
      const gridPos = {
        x: Math.round(placementPos.x - this.ship.position.x),
        y: Math.round(placementPos.y - this.ship.position.y),
        z: Math.round(placementPos.z - this.ship.position.z)
      };
      
      console.log("Attempting to place first block at grid position:", gridPos);
      
      // Remove from inventory
      const removed = this.removeFromInventory(this.inventory.selectedSlot);
      
      if (removed) {
        // Use BlockFactory to create the new block for consistency
        const newBlock = BlockFactory.createBlock(
          this.selectedBlock.type,
          { ...gridPos },
          { rotation: 0 } // Add any additional options here
        );
        
        if (!newBlock) {
          console.error("Failed to create new block using BlockFactory");
          // Add the item back to inventory since creation failed
          this.addToInventory({ type: this.selectedBlock.type });
          return;
        }
        
        console.log(`Created new block of type: ${newBlock.type} at position:`, newBlock.position);
        
        // Get the resource loader
        let resourceLoader = window.resourceLoader;
        
        // If window.resourceLoader is not available, use a simple fallback
        if (!resourceLoader) {
          console.warn("Resource loader not found on window object, using fallback");
          
          // Create a simple fallback texture loader that matches the expected interface
          resourceLoader = {
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
        
        // Create the mesh before adding to the ship
        newBlock.createMesh(this.ship.group, resourceLoader);
        
        // Add to ship's blocks array
        this.ship.blocks.push(newBlock);
        
        console.log("Block added to ship");
        
        // Force update the ship's group to ensure the new block is visible
        this.ship.group.updateMatrixWorld(true);
        
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
        
        // Save ship to localStorage if shipStorage is available
        if (this.shipStorage && this.username) {
          try {
            const shipDefinition = this.ship.serialize();
            this.shipStorage.saveShip(this.username, shipDefinition);
            console.log("Ship saved to localStorage");
          } catch (error) {
            console.error("Error saving ship to localStorage:", error);
          }
        }
        
        // Also save the inventory state
        this.saveInventory();
      } else {
        console.error("Failed to remove block from inventory");
      }
    } else {
      // No ship available
      console.log("No ship available to place blocks on");
      return;
    }
    
    // Validate ship blocks after placing
    this.validateShipBlocks();
    
    // Clean up the ship to remove any ghost blocks
    this.cleanupShip();
  }

  /**
   * Update the player's UI elements
   */
  updateUI() {
    // Update mode indicator
    if (this.uiElements.modeIndicator) {
      this.uiElements.modeIndicator.textContent = this.mode === 'ship' ? 'Ship Mode' : 'Player Mode';
    }
    
    // Update stats
    if (this.uiElements.stats) {
      this.uiElements.stats.textContent = `${this.username} | Kills: ${this.kills} | Deaths: ${this.deaths}`;
    }
    
    // Update inventory visibility
    if (this.uiElements.inventory) {
      this.uiElements.inventory.style.display = this.mode === 'player' ? 'block' : 'none';
    }
    
    // Update inventory slots
    this.updateInventoryUI();
  }

  /**
   * Update the inventory UI
   */
  updateInventoryUI() {
    console.log("Updating inventory UI");
    console.log(`Current selected slot: ${this.inventory.selectedSlot + 1}`);
    
    // Get the inventory container
    const inventoryContainer = document.getElementById('inventory');
    if (!inventoryContainer) {
      console.error("Inventory container not found");
      return;
    }
    
    console.log(`Clearing inventory container with ${inventoryContainer.children.length} children`);
    
    // Clear existing slots
    inventoryContainer.innerHTML = '';
    
    // Create slots
    for (let i = 0; i < this.inventory.slots.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.dataset.slot = i;
      
      // Mark as selected if this is the selected slot
      if (i === this.inventory.selectedSlot) {
        slot.classList.add('selected');
        console.log(`Marking slot ${i + 1} as selected (selectedSlot = ${this.inventory.selectedSlot + 1})`);
      }
      
      // Add slot number
      const slotNumber = document.createElement('div');
      slotNumber.className = 'slot-number';
      slotNumber.textContent = (i + 1).toString();
      slot.appendChild(slotNumber);
      
      // Add item if slot is not empty
      const item = this.inventory.slots[i];
      if (item) {
        // Create item element
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        
        // Try to set background image using the resource loader
        let textureApplied = false;
        try {
          const resourceLoader = window.resourceLoader;
          if (resourceLoader && typeof resourceLoader.getUrl === 'function') {
            const textureUrl = resourceLoader.getUrl(item.type);
            if (textureUrl) {
              // Use the texture URL directly
              itemElement.style.backgroundImage = `url(${textureUrl})`;
              itemElement.style.backgroundSize = '80%'; // Slightly smaller for better appearance
              itemElement.style.backgroundPosition = 'center';
              itemElement.style.backgroundRepeat = 'no-repeat';
              textureApplied = true;
              
              // Add a subtle border and shadow for 3D effect even with texture
              itemElement.style.border = '1px solid rgba(255,255,255,0.3)';
              itemElement.style.boxShadow = 'inset 0 0 8px rgba(0, 0, 0, 0.3)';
            } else {
              console.warn(`No texture URL found for ${item.type}`);
            }
          } else {
            console.warn('Resource loader or getUrl method not available');
          }
        } catch (error) {
          console.warn(`Failed to load texture for ${item.type}:`, error);
        }
        
        // If texture loading failed, use a color fallback with a 3D-like appearance
        if (!textureApplied) {
          let backgroundColor;
          let borderTopColor;
          let borderLeftColor;
          let borderRightColor;
          let borderBottomColor;
          let itemIcon = '';
          
          switch (item.type) {
            case 'wood':
              backgroundColor = '#8B4513';
              borderTopColor = '#A0522D';
              borderLeftColor = '#A0522D';
              borderRightColor = '#654321';
              borderBottomColor = '#654321';
              itemIcon = '🪵';
              break;
            case 'stone':
              backgroundColor = '#808080';
              borderTopColor = '#A0A0A0';
              borderLeftColor = '#A0A0A0';
              borderRightColor = '#606060';
              borderBottomColor = '#606060';
              itemIcon = '🧱';
              break;
            case 'lift':
              backgroundColor = '#FFD700';
              borderTopColor = '#FFF700';
              borderLeftColor = '#FFF700';
              borderRightColor = '#DAA520';
              borderBottomColor = '#DAA520';
              itemIcon = '🎈';
              break;
            case 'cannon':
              backgroundColor = '#696969';
              borderTopColor = '#808080';
              borderLeftColor = '#808080';
              borderRightColor = '#505050';
              borderBottomColor = '#505050';
              itemIcon = '💣';
              break;
            case 'control':
              backgroundColor = '#8B0000';
              borderTopColor = '#A52A2A';
              borderLeftColor = '#A52A2A';
              borderRightColor = '#800000';
              borderBottomColor = '#800000';
              itemIcon = '🎮';
              break;
            default:
              backgroundColor = '#AAAAAA';
              borderTopColor = '#CCCCCC';
              borderLeftColor = '#CCCCCC';
              borderRightColor = '#888888';
              borderBottomColor = '#888888';
              itemIcon = '📦';
              break;
          }
          
          // Apply 3D-like styles
          itemElement.style.backgroundColor = backgroundColor;
          itemElement.style.borderTop = `2px solid ${borderTopColor}`;
          itemElement.style.borderLeft = `2px solid ${borderLeftColor}`;
          itemElement.style.borderRight = `2px solid ${borderRightColor}`;
          itemElement.style.borderBottom = `2px solid ${borderBottomColor}`;
          itemElement.style.boxShadow = 'inset 0 0 10px rgba(0, 0, 0, 0.4)';
          
          // Add icon as fallback
          if (itemIcon) {
            const iconElement = document.createElement('div');
            iconElement.className = 'item-icon';
            iconElement.textContent = itemIcon;
            iconElement.style.fontSize = '24px';
            iconElement.style.textAlign = 'center';
            iconElement.style.lineHeight = '40px';
            itemElement.appendChild(iconElement);
          }
        }
        
        // Add item count if more than 1
        if (item.count > 1) {
          const countElement = document.createElement('div');
          countElement.className = 'item-count';
          countElement.textContent = item.count.toString();
          countElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          countElement.style.color = 'white';
          countElement.style.borderRadius = '50%';
          countElement.style.padding = '2px 6px';
          countElement.style.position = 'absolute';
          countElement.style.bottom = '2px';
          countElement.style.right = '2px';
          countElement.style.fontSize = '12px';
          countElement.style.fontWeight = 'bold';
          itemElement.appendChild(countElement);
        }
        
        // Add item name tooltip
        itemElement.title = `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} (${item.count})`;
        
        // Add item to slot
        slot.appendChild(itemElement);
      }
      
      // Add click event to select this slot
      slot.addEventListener('click', () => {
        this.selectInventorySlot(i);
      });
      
      // Add slot to inventory container
      inventoryContainer.appendChild(slot);
    }
    
    // Update body class based on mode
    document.body.classList.remove('player-mode', 'ship-mode');
    document.body.classList.add(`${this.mode}-mode`);
  }

  /**
   * Update the camera position and rotation
   */
  updateCamera() {
    try {
      if (!this.camera) return;
      
      if (this.mode === 'ship') {
        // Ship Mode - Third-person camera following the ship
        if (this.ship) {
          try {
            const { position, target } = this.ship.getCameraPositionAndTarget();
            
            this.camera.position.set(position.x, position.y, position.z);
            this.camera.lookAt(target.x, target.y, target.z);
          } catch (error) {
            console.error('Error updating ship camera:', error);
            
            // Fallback camera position
            this.camera.position.set(0, 60, 20);
            this.camera.lookAt(0, 50, 0);
          }
        }
      } else {
        // Player Mode - First-person camera
        this.camera.position.set(
          this.character.position.x,
          this.character.position.y + 1.6, // Eye level
          this.character.position.z
        );
        
        // Apply camera rotation
        this.camera.rotation.order = 'YXZ'; // This order is important for first-person controls
        this.camera.rotation.x = this.cameraRotation.x;
        this.camera.rotation.y = this.cameraRotation.y;
        this.camera.rotation.z = 0;
        
        // Update the camera's matrices to ensure they're current
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
      }
    } catch (error) {
      console.error('Error in updateCamera:', error);
    }
  }

  /**
   * Update the player's character position and physics
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  updateCharacter(deltaTime) {
    if (this.mode !== 'player') return;
    
    // Apply gravity
    this.character.velocity.y -= 9.8 * deltaTime;
    
    // Apply movement based on controls
    const moveSpeed = this.character.isSneaking ? 1 : 2;
    
    // Create direction vectors based on camera orientation
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    // Apply character rotation to these vectors
    forward.applyEuler(new THREE.Euler(0, this.character.rotation, 0, 'YXZ'));
    right.applyEuler(new THREE.Euler(0, this.character.rotation, 0, 'YXZ'));
    
    // Calculate final movement direction
    const finalDirection = new THREE.Vector3(0, 0, 0);
    
    if (this.controls.forward) finalDirection.add(forward);
    if (this.controls.backward) finalDirection.sub(forward);
    if (this.controls.right) finalDirection.add(right);
    if (this.controls.left) finalDirection.sub(right);
    
    // Apply movement
    if (finalDirection.length() > 0) {
      finalDirection.normalize().multiplyScalar(moveSpeed * deltaTime);
      
      // Apply movement to velocity
      this.character.velocity.x = finalDirection.x;
      this.character.velocity.z = finalDirection.z;
    } else {
      // Stop horizontal movement
      this.character.velocity.x = 0;
      this.character.velocity.z = 0;
    }
    
    // Apply jumping
    if (this.controls.jump && !this.character.isJumping) {
      this.character.velocity.y = 2.5;
      this.character.isJumping = true;
    }
    
    // Apply sneaking
    this.character.isSneaking = this.controls.sneak;
    
    // Store current position before movement
    const previousPosition = {
      x: this.character.position.x,
      y: this.character.position.y,
      z: this.character.position.z
    };
    
    // Update position
    const newPosition = {
      x: previousPosition.x + this.character.velocity.x,
      y: previousPosition.y + this.character.velocity.y * deltaTime,
      z: previousPosition.z + this.character.velocity.z
    };
    
    // Collision detection with ship blocks
    if (this.ship && this.ship.blocks.length > 0) {
      // Create a simple collision box for the character
      const characterBox = new THREE.Box3();
      const characterSize = { 
        width: this.character.width, 
        height: this.character.height, 
        depth: this.character.width 
      };
      
      // Set up character box at the new position
      characterBox.min.set(
        newPosition.x - characterSize.width / 2,
        newPosition.y,
        newPosition.z - characterSize.width / 2
      );
      
      characterBox.max.set(
        newPosition.x + characterSize.width / 2,
        newPosition.y + characterSize.height,
        newPosition.z + characterSize.width / 2
      );
      
      // Check for collisions with blocks
      let collisionDetected = false;
      
      for (const block of this.ship.blocks) {
        // Skip blocks without meshes
        if (!block.mesh) continue;
        
        // Get block position in world space using the ship's getBlockWorldPosition method
        const blockWorldPos = this.ship.getBlockWorldPosition(block);
        
        // Create a box for the block
        const blockBox = new THREE.Box3();
        blockBox.min.set(
          blockWorldPos.x - 0.5,
          blockWorldPos.y - 0.5,
          blockWorldPos.z - 0.5
        );
        
        blockBox.max.set(
          blockWorldPos.x + 0.5,
          blockWorldPos.y + 0.5,
          blockWorldPos.z + 0.5
        );
        
        // Check for intersection
        if (characterBox.intersectsBox(blockBox)) {
          collisionDetected = true;
          console.log(`Collision with block at local position ${JSON.stringify(block.position)}, world position ${JSON.stringify(blockWorldPos)}`);
          break;
        }
      }
      
      // If collision detected, try to slide along walls
      if (collisionDetected) {
        console.log("Collision detected with ship block");
        
        // Try X movement only
        const xOnlyPosition = {
          x: previousPosition.x + this.character.velocity.x,
          y: newPosition.y,
          z: previousPosition.z
        };
        
        // Check X-only movement
        characterBox.min.set(
          xOnlyPosition.x - characterSize.width / 2,
          xOnlyPosition.y,
          xOnlyPosition.z - characterSize.width / 2
        );
        
        characterBox.max.set(
          xOnlyPosition.x + characterSize.width / 2,
          xOnlyPosition.y + characterSize.height,
          xOnlyPosition.z + characterSize.width / 2
        );
        
        // Check if X-only movement is valid
        let xCollision = false;
        for (const block of this.ship.blocks) {
          if (!block.mesh) continue;
          
          // Get block position in world space
          const blockWorldPos = this.ship.getBlockWorldPosition(block);
          
          // Create a box for the block
          const blockBox = new THREE.Box3();
          blockBox.min.set(
            blockWorldPos.x - 0.5,
            blockWorldPos.y - 0.5,
            blockWorldPos.z - 0.5
          );
          
          blockBox.max.set(
            blockWorldPos.x + 0.5,
            blockWorldPos.y + 0.5,
            blockWorldPos.z + 0.5
          );
          
          if (characterBox.intersectsBox(blockBox)) {
            xCollision = true;
            break;
          }
        }
        
        // Try Z movement only
        const zOnlyPosition = {
          x: previousPosition.x,
          y: newPosition.y,
          z: previousPosition.z + this.character.velocity.z
        };
        
        // Check Z-only movement
        characterBox.min.set(
          zOnlyPosition.x - characterSize.width / 2,
          zOnlyPosition.y,
          zOnlyPosition.z - characterSize.width / 2
        );
        
        characterBox.max.set(
          zOnlyPosition.x + characterSize.width / 2,
          zOnlyPosition.y + characterSize.height,
          zOnlyPosition.z + characterSize.width / 2
        );
        
        // Check if Z-only movement is valid
        let zCollision = false;
        for (const block of this.ship.blocks) {
          if (!block.mesh) continue;
          
          // Get block position in world space
          const blockWorldPos = this.ship.getBlockWorldPosition(block);
          
          // Create a box for the block
          const blockBox = new THREE.Box3();
          blockBox.min.set(
            blockWorldPos.x - 0.5,
            blockWorldPos.y - 0.5,
            blockWorldPos.z - 0.5
          );
          
          blockBox.max.set(
            blockWorldPos.x + 0.5,
            blockWorldPos.y + 0.5,
            blockWorldPos.z + 0.5
          );
          
          if (characterBox.intersectsBox(blockBox)) {
            zCollision = true;
            break;
          }
        }
        
        // Apply the valid movement
        if (!xCollision) {
          newPosition.x = xOnlyPosition.x;
          newPosition.z = previousPosition.z;
        } else if (!zCollision) {
          newPosition.x = previousPosition.x;
          newPosition.z = zOnlyPosition.z;
        } else {
          // Both directions have collisions, don't move horizontally
          newPosition.x = previousPosition.x;
          newPosition.z = previousPosition.z;
        }
      }
    }
    
    // Update character position with collision-checked position
    this.character.position = newPosition;
    
    // Check if character is on ground
    const groundY = 0;
    if (this.character.position.y <= groundY) {
      this.character.position.y = groundY;
      this.character.velocity.y = 0;
      this.character.isJumping = false;
    }
    
    // Keep character on the ship
    if (this.ship) {
      // Check if character is too far from steering wheel
      const steeringWheelPos = this.ship.steeringWheel ? 
        this.ship.getBlockWorldPosition(this.ship.steeringWheel) : 
        this.ship.position;
      
      const distanceFromWheel = Math.sqrt(
        Math.pow(this.character.position.x - steeringWheelPos.x, 2) +
        Math.pow(this.character.position.z - steeringWheelPos.z, 2)
      );
      
      if (distanceFromWheel > 25) {
        // Teleport back to steering wheel
        this.character.position = { ...steeringWheelPos };
        this.character.position.y += 1; // Stand on top of the steering wheel
        this.character.velocity = { x: 0, y: 0, z: 0 };
        this.character.isJumping = false;
      }
      
      // Move with the ship
      this.character.position.x += this.ship.velocity.x * deltaTime;
      this.character.position.y += this.ship.velocity.y * deltaTime;
      this.character.position.z += this.ship.velocity.z * deltaTime;
    }
    
    // Update character mesh position
    if (this.character.mesh) {
      this.character.mesh.position.set(
        this.character.position.x,
        this.character.position.y,
        this.character.position.z
      );
    }
  }

  /**
   * Update the player
   * @param {Number} deltaTime - Time since last frame in seconds
   * @param {THREE.Scene} scene - The Three.js scene
   */
  update(deltaTime, scene) {
    try {
      // Update ship controls in Ship Mode
      if (this.mode === 'ship' && this.ship) {
        try {
          // DIRECT VERTICAL MOVEMENT: Handle Q and E keys directly
          if (this.controls.up) {
            console.log("PLAYER CLASS: Direct UP movement");
            // Move up at exactly 1 unit per second
            this.ship.position.y += 1 * deltaTime;
            if (this.ship.group) {
              this.ship.group.position.y = this.ship.position.y;
              console.log(`Ship Y position: ${this.ship.position.y}`);
            }
          } else if (this.controls.down) {
            console.log("PLAYER CLASS: Direct DOWN movement");
            // Move down at exactly 1 unit per second
            this.ship.position.y -= 1 * deltaTime;
            if (this.ship.group) {
              this.ship.group.position.y = this.ship.position.y;
              console.log(`Ship Y position: ${this.ship.position.y}`);
            }
          }
          
          // Apply thrust for horizontal movement only
          this.ship.applyThrust(this.controls);
          
          // Fire cannons
          if (this.controls.fire) {
            // Determine which direction to fire based on movement controls
            let fireDirection = null;
            
            if (this.controls.forward) {
              fireDirection = 'forward';
            } else if (this.controls.backward) {
              fireDirection = 'backward';
            } else if (this.controls.left) {
              fireDirection = 'left';
            } else if (this.controls.right) {
              fireDirection = 'right';
            }
            
            if (fireDirection) {
              this.ship.fireCannons(fireDirection, scene);
              this.controls.fire = false; // Reset fire control to prevent continuous firing
            }
          }
        } catch (error) {
          console.error('Error updating ship controls:', error);
        }
      }
      
      // Update ship
      if (this.ship) {
        try {
          // In player mode, ensure the ship doesn't sink
          if (this.mode === 'player') {
            // Save the original isSinking state
            const originalIsSinking = this.ship.isSinking;
            
            // Force the ship to not sink in player mode
            this.ship.isSinking = false;
            
            // Update the ship
            this.ship.update(deltaTime);
            
            // Restore the original isSinking state for when we switch back to ship mode
            this.ship.isSinking = originalIsSinking;
          } else {
            // Normal update in ship mode
            this.ship.update(deltaTime);
          }
        } catch (error) {
          console.error('Error updating ship:', error);
        }
      }
      
      // Update character in Player Mode
      if (this.mode === 'player') {
        try {
          this.updateCharacter(deltaTime);
        } catch (error) {
          console.error('Error updating character:', error);
        }
      }
      
      // Update camera
      try {
        this.updateCamera();
      } catch (error) {
        console.error('Error updating camera:', error);
      }
      
      // Update UI
      try {
        this.updateUI();
      } catch (error) {
        console.error('Error updating UI:', error);
      }
    } catch (error) {
      console.error('Error in player update:', error);
    }
  }

  /**
   * Save the inventory state to local storage
   */
  saveInventory() {
    if (this.username) {
      try {
        // Create a serializable version of the inventory
        const inventoryData = {
          slots: this.inventory.slots,
          selectedSlot: this.inventory.selectedSlot,
          maxStackSize: this.inventory.maxStackSize,
          infiniteBlocks: this.inventory.infiniteBlocks
        };
        
        // Save to local storage
        localStorage.setItem(`inventory_${this.username}`, JSON.stringify(inventoryData));
        console.log("Inventory saved to localStorage");
      } catch (error) {
        console.error("Error saving inventory to localStorage:", error);
      }
    }
  }
  
  /**
   * Load the inventory state from local storage
   * @returns {Boolean} - Whether the inventory was successfully loaded
   */
  loadInventory() {
    if (this.username) {
      try {
        // Get from local storage
        const inventoryData = localStorage.getItem(`inventory_${this.username}`);
        
        if (inventoryData) {
          // Parse the data
          const parsedData = JSON.parse(inventoryData);
          
          // Update the inventory
          this.inventory.slots = parsedData.slots;
          this.inventory.selectedSlot = parsedData.selectedSlot;
          this.inventory.maxStackSize = parsedData.maxStackSize;
          this.inventory.infiniteBlocks = parsedData.infiniteBlocks !== undefined ? 
            parsedData.infiniteBlocks : true; // Default to true if not specified
          
          // Update the UI
          this.updateInventoryUI();
          
          console.log("Inventory loaded from localStorage");
          return true;
        }
      } catch (error) {
        console.error("Error loading inventory from localStorage:", error);
      }
    }
    
    return false;
  }

  /**
   * Clean up the ship to remove any ghost blocks
   * This can be called after block operations or when issues are detected
   */
  cleanupShip() {
    if (!this.ship) return;
    
    console.log("Cleaning up ship...");
    
    // Fix any texture issues with blocks
    if (typeof this.ship.fixBlockTextureIssues === 'function') {
      const fixedCount = this.ship.fixBlockTextureIssues();
      console.log(`Fixed textures for ${fixedCount} blocks during cleanup`);
    }
    
    // Rest of cleanup code...
    const result = this.ship.cleanupOrphanedMeshes();
    console.log(`Cleanup result: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Validate the ship's block-mesh positions
   * This should be called after any operation that modifies blocks
   */
  validateShipBlocks() {
    if (this.ship) {
      console.log("Validating ship blocks...");
      const fixedCount = this.ship.validateBlockMeshPositions();
      console.log(`Validation fixed ${fixedCount} block positions`);
      return fixedCount;
    }
    return 0;
  }
}

export default Player; 
