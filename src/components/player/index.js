/**
 * Player Class - Main Entry Point
 * 
 * This file serves as the main entry point for the Player class,
 * importing and coordinating all the modular components.
 */

import * as THREE from 'three';
import Ship from '../ship.js';

// Import player components
import PlayerInventory from './inventory/PlayerInventory.js';
import PlayerControls from './controls/PlayerControls.js';
import PlayerCharacter from './modes/PlayerCharacter.js';
import PlayerUI from './ui/PlayerUI.js';
import { updateCamera } from './utils/CameraUtils.js';
import { validateShipBlocks, cleanupShip } from './utils/ShipUtils.js';

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
    
    // Initialize player character
    this.character = new PlayerCharacter();
    
    // Camera
    this.camera = options.camera || null;
    this.cameraRotation = { x: 0, y: 0 };
    
    // Initialize inventory
    this.inventory = new PlayerInventory();
    
    // Initialize controls
    this.controls = new PlayerControls(this);
    
    // Block placement
    this.maxPlaceDistance = 5; // Maximum distance to place blocks (in Player Mode)
    this.selectedBlock = null; // Currently selected block type for placement
    
    // UI elements
    this.ui = new PlayerUI(this);
  }

  /**
   * Initialize the player
   * @param {THREE.Scene} scene - The Three.js scene
   * @param {THREE.Camera} camera - The Three.js camera
   */
  init(scene, camera) {
    this.camera = camera;
    
    // Create player character mesh
    this.character.createMesh(scene);
    
    // Create a new ship for the player
    this.ship = new Ship({
      owner: this,
      position: { x: 0, y: 100, z: 0 }
    });
    
    // Initialize UI
    this.ui.init();
    
    // Try to load inventory from local storage, or initialize with defaults
    if (!this.inventory.load(this.username)) {
      this.inventory.initialize();
    }
    
    // Select the first inventory slot by default
    this.inventory.selectSlot(0);
    
    // Update UI
    this.ui.update();
    
    // Set up event listeners for controls
    this.controls.setupEventListeners();
    
    console.log('Player initialized with inventory:', this.inventory.slots);
  }

  /**
   * Toggle between Ship Mode and Player Mode
   */
  toggleMode() {
    if (this.mode === 'ship') {
      // Switch to Player Mode
      this.mode = 'player';
      
      // Position character on the ship
      if (this.ship && this.ship.steeringWheel) {
        const wheelPos = this.ship.getBlockWorldPosition(this.ship.steeringWheel);
        this.character.position = { ...wheelPos };
        this.character.position.y += 1; // Stand on top of the steering wheel
        this.character.updateMeshPosition();
      } else {
        // Fallback if no steering wheel is found
        console.warn("No steering wheel found, positioning character at ship center");
        this.character.position = { 
          x: this.ship.position.x, 
          y: this.ship.position.y + 2, // Position above the ship
          z: this.ship.position.z 
        };
        this.character.updateMeshPosition();
      }
      
      // Show player character
      this.character.setVisible(true);
      
      // Reset inventory selection to first slot when entering player mode
      this.inventory.selectSlot(0);
      
      // Request pointer lock for first-person view
      document.body.requestPointerLock();
    } else {
      // Switch to Ship Mode
      this.mode = 'ship';
      
      // Hide player character
      this.character.setVisible(false);
      
      // Exit pointer lock
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
    
    // Update UI
    this.ui.update();
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
        // Handle direct vertical movement
        if (this.controls.state.up) {
          // Move up at exactly 1 unit per second
          this.ship.position.y += 1 * deltaTime;
          if (this.ship.group) {
            this.ship.group.position.y = this.ship.position.y;
          }
        } else if (this.controls.state.down) {
          // Move down at exactly 1 unit per second
          this.ship.position.y -= 1 * deltaTime;
          if (this.ship.group) {
            this.ship.group.position.y = this.ship.position.y;
          }
        }
        
        // Apply thrust for horizontal movement
        this.ship.applyThrust(this.controls.state);
        
        // Fire cannons
        if (this.controls.state.fire) {
          // Determine which direction to fire based on movement controls
          let fireDirection = null;
          
          if (this.controls.state.forward) {
            fireDirection = 'forward';
          } else if (this.controls.state.backward) {
            fireDirection = 'backward';
          } else if (this.controls.state.left) {
            fireDirection = 'left';
          } else if (this.controls.state.right) {
            fireDirection = 'right';
          }
          
          if (fireDirection) {
            this.ship.fireCannons(fireDirection, scene);
            this.controls.state.fire = false; // Reset fire control
          }
        }
      }
      
      // Update ship
      if (this.ship) {
        // In player mode, ensure the ship doesn't sink
        if (this.mode === 'player') {
          const originalIsSinking = this.ship.isSinking;
          this.ship.isSinking = false;
          this.ship.update(deltaTime);
          this.ship.isSinking = originalIsSinking;
        } else {
          this.ship.update(deltaTime);
        }
      }
      
      // Update character in Player Mode
      if (this.mode === 'player') {
        this.character.update(deltaTime, this.controls.state, this.ship);
      }
      
      // Update camera
      updateCamera(this);
      
      // Update UI
      this.ui.update();
    } catch (error) {
      console.error('Error in player update:', error);
    }
  }

  /**
   * Validate the ship's block-mesh positions
   */
  validateShipBlocks() {
    return validateShipBlocks(this.ship);
  }

  /**
   * Clean up the ship to remove any ghost blocks
   */
  cleanupShip() {
    return cleanupShip(this.ship);
  }
}

export default Player; 