/**
 * PlayerControls Class
 * 
 * Manages player input and controls, including:
 * - Keyboard and mouse event handling
 * - Control state management
 * - Mode-specific controls
 */

import BlockInteractions from './BlockInteractions.js';

class PlayerControls {
  /**
   * Constructor for the PlayerControls class
   * @param {Object} player - The player instance
   */
  constructor(player) {
    this.player = player;
    
    // Controls state
    this.state = {
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
    
    // Block interactions
    this.blockInteractions = new BlockInteractions(player);
  }

  /**
   * Set up event listeners for keyboard and mouse controls
   */
  setupEventListeners() {
    console.log("Setting up event listeners for player controls");
    
    // Keyboard controls
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse controls
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Prevent context menu on right-click
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      return false;
    });
    
    // Request pointer lock when clicking on the canvas in Player Mode
    document.addEventListener('click', () => {
      if (this.player.mode === 'player' && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    });
    
    // Add click handlers for inventory slots
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    inventorySlots.forEach((slot, index) => {
      slot.addEventListener('click', () => {
        if (this.player.mode === 'player') {
          this.player.inventory.selectSlot(index);
          this.player.ui.updateInventory();
        }
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
    if (this.player.mode === 'player') {
      console.log(`Key pressed: ${event.key} (keyCode: ${event.keyCode})`);
    }
    
    switch (event.key.toLowerCase()) {
      // Movement controls (both modes)
      case 'w':
        this.state.forward = true;
        break;
      case 's':
        this.state.backward = true;
        break;
      case 'a':
        this.state.left = true;
        break;
      case 'd':
        this.state.right = true;
        break;
        
      // Ship Mode specific controls
      case 'q':
        if (this.player.mode === 'ship') this.state.up = true;
        break;
      case 'e':
        if (this.player.mode === 'ship') this.state.down = true;
        break;
        
      // Player Mode specific controls
      case ' ':
        if (this.player.mode === 'player') this.state.jump = true;
        break;
      case 'x':
        if (this.player.mode === 'player') this.state.sneak = true;
        break;
        
      // Mode switching
      case 'b':
        this.player.toggleMode();
        break;
        
      // Inventory selection (only in player mode)
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        if (this.player.mode === 'player') {
          const slotIndex = parseInt(event.key) - 1;
          this.player.inventory.selectSlot(slotIndex);
          this.player.selectedBlock = this.player.inventory.getSelectedBlock();
          this.player.ui.updateInventory();
        }
        break;
        
      // Fire cannons
      case 'r':
        this.state.fire = true;
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
        this.state.forward = false;
        break;
      case 's':
        this.state.backward = false;
        break;
      case 'a':
        this.state.left = false;
        break;
      case 'd':
        this.state.right = false;
        break;
        
      // Ship Mode specific controls
      case 'q':
        this.state.up = false;
        break;
      case 'e':
        this.state.down = false;
        break;
        
      // Player Mode specific controls
      case ' ':
        this.state.jump = false;
        break;
      case 'x':
        this.state.sneak = false;
        break;
        
      // Fire cannons
      case 'r':
        this.state.fire = false;
        break;
    }
  }

  /**
   * Handle mouse movement
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseMove(event) {
    if (this.player.mode === 'player' && document.pointerLockElement) {
      // Player Mode - First-person camera rotation
      const sensitivity = 0.002;
      this.player.cameraRotation.y -= event.movementX * sensitivity;
      this.player.cameraRotation.x -= event.movementY * sensitivity;
      
      // Limit vertical rotation to prevent flipping
      this.player.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.player.cameraRotation.x));
      
      // Update character rotation
      this.player.character.rotation = this.player.cameraRotation.y;
    }
  }

  /**
   * Handle mouse down events
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseDown(event) {
    // Prevent default behavior for right-click
    if (event.button === 2) {
      event.preventDefault();
    }
    
    if (this.player.mode === 'player') {
      if (event.button === 0) {
        // Left click - Break block
        this.blockInteractions.breakBlock();
      } else if (event.button === 2) {
        // Right click - Place block
        this.blockInteractions.placeBlock();
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
}

export default PlayerControls; 