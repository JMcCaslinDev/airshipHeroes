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
      maxStackSize: 64
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
    this.maxPlaceDistance = 4; // Maximum distance to place blocks (in Player Mode)
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
    this.uiElements.inventory = document.getElementById('ui-container');
    this.uiElements.modeIndicator = document.getElementById('mode-indicator');
    this.uiElements.stats = document.getElementById('stats');
    
    // Update UI
    this.updateUI();
    
    // Set up event listeners for controls
    this.setupEventListeners();
  }

  /**
   * Create the player character mesh (for Player Mode)
   * @param {THREE.Scene} scene - The Three.js scene
   */
  createCharacterMesh(scene) {
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
  }

  /**
   * Set up event listeners for player controls
   */
  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => this.handleKeyDown(event));
    document.addEventListener('keyup', (event) => this.handleKeyUp(event));
    
    // Mouse controls
    document.addEventListener('mousemove', (event) => this.handleMouseMove(event));
    document.addEventListener('mousedown', (event) => this.handleMouseDown(event));
    document.addEventListener('mouseup', (event) => this.handleMouseUp(event));
    
    // Prevent context menu on right-click
    document.addEventListener('contextmenu', (event) => event.preventDefault());
    
    // Handle pointer lock for first-person view
    document.addEventListener('click', () => {
      if (this.mode === 'player' && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    });
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown(event) {
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
      case 'f':
        this.toggleMode();
        break;
        
      // Inventory selection
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        this.selectInventorySlot(parseInt(event.key) - 1);
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
    if (this.mode === 'player') {
      if (event.button === 0) {
        // Left click - Break block
        this.breakBlock();
      } else if (event.button === 2) {
        // Right click - Place block
        this.placeBlock();
      }
    }
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
   * @param {Number} slotIndex - The index of the slot to select (0-8)
   */
  selectInventorySlot(slotIndex) {
    if (slotIndex >= 0 && slotIndex < this.inventory.slots.length) {
      this.inventory.selectedSlot = slotIndex;
      
      // Update UI
      this.updateInventoryUI();
      
      // Update selected block type
      this.selectedBlock = this.inventory.slots[slotIndex];
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
      
      if (slot && slot.count >= count) {
        // Remove items
        slot.count -= count;
        
        // Remove slot if empty
        if (slot.count <= 0) {
          this.inventory.slots[slotIndex] = null;
        }
        
        this.updateInventoryUI();
        return true;
      }
    }
    
    return false;
  }

  /**
   * Break a block in the direction the player is looking
   */
  breakBlock() {
    if (this.mode !== 'player') return;
    
    // Raycast to find block
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyEuler(new THREE.Euler(this.cameraRotation.x, this.cameraRotation.y, 0, 'YXZ'));
    
    raycaster.set(
      new THREE.Vector3(
        this.character.position.x,
        this.character.position.y + 1.6, // Eye level
        this.character.position.z
      ),
      direction
    );
    
    // Check for intersections with ship blocks
    if (this.ship && this.ship.group) {
      const intersects = raycaster.intersectObjects(this.ship.group.children, true);
      
      if (intersects.length > 0) {
        const intersection = intersects[0];
        
        // Get the block from the mesh
        const block = intersection.object.userData.block;
        
        if (block) {
          // Damage the block
          const destroyed = block.takeDamage(1);
          
          if (destroyed) {
            // Add to inventory
            this.addToInventory({ type: block.type });
            
            // Remove from ship
            this.ship.removeBlock(block);
          }
        }
      }
    }
  }

  /**
   * Place a block in the direction the player is looking
   */
  placeBlock() {
    if (this.mode !== 'player' || !this.selectedBlock) return;
    
    // Raycast to find placement position
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyEuler(new THREE.Euler(this.cameraRotation.x, this.cameraRotation.y, 0, 'YXZ'));
    
    raycaster.set(
      new THREE.Vector3(
        this.character.position.x,
        this.character.position.y + 1.6, // Eye level
        this.character.position.z
      ),
      direction
    );
    
    // Check for intersections with ship blocks
    if (this.ship && this.ship.group) {
      const intersects = raycaster.intersectObjects(this.ship.group.children, true);
      
      if (intersects.length > 0) {
        const intersection = intersects[0];
        
        // Calculate placement position (adjacent to hit face)
        const normal = intersection.face.normal.clone();
        normal.transformDirection(intersection.object.matrixWorld);
        
        const placementPos = intersection.point.clone().add(normal.multiplyScalar(0.5));
        
        // Convert to grid position
        const gridPos = {
          x: Math.round(placementPos.x - this.ship.position.x),
          y: Math.round(placementPos.y - this.ship.position.y),
          z: Math.round(placementPos.z - this.ship.position.z)
        };
        
        // Check if position is within placement range
        const distance = Math.sqrt(
          Math.pow(gridPos.x - this.character.position.x + this.ship.position.x, 2) +
          Math.pow(gridPos.y - this.character.position.y + this.ship.position.y, 2) +
          Math.pow(gridPos.z - this.character.position.z + this.ship.position.z, 2)
        );
        
        if (distance <= this.maxPlaceDistance) {
          // Check if there's already a block at this position
          const existingBlock = this.ship.blocks.find(block => 
            block.position.x === gridPos.x &&
            block.position.y === gridPos.y &&
            block.position.z === gridPos.z
          );
          
          if (!existingBlock) {
            // Remove from inventory
            const removed = this.removeFromInventory(this.inventory.selectedSlot);
            
            if (removed) {
              // Create new block
              const newBlock = BlockFactory.createBlock(
                this.selectedBlock.type,
                gridPos
              );
              
              // Add to ship
              if (newBlock) {
                this.ship.addBlock(newBlock);
              }
            }
          }
        }
      }
    }
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
    const inventoryContainer = document.getElementById('inventory');
    if (!inventoryContainer) return;
    
    // Update each slot
    const slots = inventoryContainer.querySelectorAll('.inventory-slot');
    
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const item = this.inventory.slots[i];
      
      // Clear slot
      slot.innerHTML = '';
      slot.classList.remove('active');
      
      // Add item if exists
      if (item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.textContent = item.type.charAt(0).toUpperCase() + item.type.slice(1);
        
        if (item.count > 1) {
          const countElement = document.createElement('span');
          countElement.className = 'item-count';
          countElement.textContent = item.count;
          itemElement.appendChild(countElement);
        }
        
        slot.appendChild(itemElement);
      }
      
      // Highlight selected slot
      if (i === this.inventory.selectedSlot) {
        slot.classList.add('active');
      }
    }
  }

  /**
   * Update the player's camera based on the current mode
   */
  updateCamera() {
    if (!this.camera) return;
    
    if (this.mode === 'ship') {
      // Ship Mode - Third-person camera following the ship
      if (this.ship) {
        const { position, target } = this.ship.getCameraPositionAndTarget();
        
        this.camera.position.set(position.x, position.y, position.z);
        this.camera.lookAt(target.x, target.y, target.z);
      }
    } else {
      // Player Mode - First-person camera
      this.camera.position.set(
        this.character.position.x,
        this.character.position.y + 1.6, // Eye level
        this.character.position.z
      );
      
      // Apply camera rotation
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.x = this.cameraRotation.x;
      this.camera.rotation.y = this.cameraRotation.y;
      this.camera.rotation.z = 0;
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
    const moveSpeed = this.character.isSneaking ? 2 : 4;
    const moveVector = new THREE.Vector3(0, 0, 0);
    
    if (this.controls.forward) moveVector.z -= 1;
    if (this.controls.backward) moveVector.z += 1;
    if (this.controls.left) moveVector.x -= 1;
    if (this.controls.right) moveVector.x += 1;
    
    // Normalize movement vector
    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed * deltaTime);
    }
    
    // Apply rotation to movement
    moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.character.rotation);
    
    // Apply movement to velocity
    this.character.velocity.x = moveVector.x;
    this.character.velocity.z = moveVector.z;
    
    // Apply jumping
    if (this.controls.jump && !this.character.isJumping) {
      this.character.velocity.y = 5;
      this.character.isJumping = true;
    }
    
    // Apply sneaking
    this.character.isSneaking = this.controls.sneak;
    
    // Update position
    this.character.position.x += this.character.velocity.x;
    this.character.position.y += this.character.velocity.y * deltaTime;
    this.character.position.z += this.character.velocity.z;
    
    // Collision detection with ship blocks
    // (Simplified - in a full implementation, this would be more complex)
    
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
    // Update ship controls in Ship Mode
    if (this.mode === 'ship' && this.ship) {
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
    }
    
    // Update ship
    if (this.ship) {
      this.ship.update(deltaTime);
    }
    
    // Update character in Player Mode
    this.updateCharacter(deltaTime);
    
    // Update camera
    this.updateCamera();
  }
}

export default Player; 