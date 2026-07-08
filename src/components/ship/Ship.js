/**
 * Ship Class
 * 
 * Main ship class that coordinates all ship-related functionality.
 * This class delegates to specialized modules for specific functionality.
 */

import * as THREE from 'three';
import ShipBlockManager from './ShipBlockManager.js';
import ShipTransform from './ShipTransform.js';
import ShipRenderer from './ShipRenderer.js';
import ShipWeapons from './ShipWeapons.js';
import ShipSerialization from './ShipSerialization.js';
import { updateShipPhysics } from '../../physics/shipPhysics.js';

class Ship {
  /**
   * Constructor for the Ship class
   * @param {Object} options - Options for the ship
   */
  constructor(options = {}) {
    this.position = options.position || { x: 0, y: 100, z: 0 }; // Ship position in world
    this.rotation = options.rotation || 0; // Ship rotation (radians)
    this.velocity = { x: 0, y: 0, z: 0 }; // Current velocity
    this.angularVelocity = 0;
    this.bankAngle = 0;
    this.owner = options.owner || null; // Player who owns this ship
    this.name = options.name || 'Unnamed Ship';
    this.isSinking = false; // Whether the ship is currently sinking
    this.sinkRate = 0.5;
    this.controls = { forward: false, backward: false, left: false, right: false, up: false, down: false };
    this.worldManager = options.worldManager || null;
    
    // Group to hold all block meshes
    this.group = new THREE.Group();
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.rotation;
    
    // Make the group visible
    this.group.visible = true;
    
    // Add a debug object to make the ship visible even if blocks aren't rendering
    const debugGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const debugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
    this.group.add(this.debugMesh);
    
    // Reference to the steering wheel block
    this.steeringWheel = null;
    
    // Initialize sub-modules
    this.blockManager = new ShipBlockManager(this);
    this.transform = new ShipTransform(this);
    this.renderer = new ShipRenderer(this);
    this.weapons = new ShipWeapons(this);
    this.serialization = new ShipSerialization(this);
    
    console.log(`Ship created: ${this.name} at position:`, this.position);
  }

  /**
   * Load ship from a definition object
   * @param {Object} definition - The ship definition
   * @param {Object} options - Additional options
   * @returns {boolean} - Whether the load was successful
   */
  loadFromDefinition(definition, options = {}) {
    return this.serialization.loadFromDefinition(definition, options);
  }

  /**
   * Add a block to the ship
   * @param {Object} block - The block to add
   * @param {THREE.TextureLoader} textureLoader - Texture loader for block textures
   */
  addBlock(block, textureLoader) {
    this.blockManager.addBlock(block, textureLoader);
  }

  /**
   * Remove a block from the ship
   * @param {Object} position - The position of the block to remove
   * @returns {boolean} - Whether the block was removed
   */
  removeBlock(position) {
    return this.blockManager.removeBlock(position);
  }

  /**
   * Check if the ship has enough lift blocks (at least 30% of total)
   */
  checkLift() {
    this.blockManager.checkLift();
  }

  /**
   * Start the ship sinking
   */
  startSinking() {
    this.isSinking = true;
    console.log(`Ship "${this.name}" is sinking!`);
  }

  /**
   * Stop the ship sinking
   */
  stopSinking() {
    this.isSinking = false;
    console.log(`Ship "${this.name}" has regained lift!`);
  }

  /**
   * Fire all cannons facing a particular direction
   * @param {String} direction - The direction to fire ('forward', 'backward', 'left', 'right')
   * @param {THREE.Scene} scene - The scene to add projectiles to
   * @returns {Array} - Array of projectiles fired
   */
  fireCannons(direction, scene) {
    return this.weapons.fireCannons(direction, scene);
  }

  /**
   * Update the ship
   * @param {number} deltaTime - The time since the last update in seconds
   * @param {number} worldHeight - The maximum height of the world
   */
  update(deltaTime, worldHeight = 500) {
    updateShipPhysics(this, this.worldManager, deltaTime, worldHeight);

    // Update steering wheel's ship rotation if it exists
    if (this.steeringWheel) {
      this.steeringWheel.shipRotation = this.rotation;
    }

    // Periodically clean up orphaned meshes (every 5 seconds)
    if (!this._lastCleanupTime) {
      this._lastCleanupTime = 0;
    }

    this._lastCleanupTime += deltaTime;
    if (this._lastCleanupTime > 5) {
      this.renderer.cleanupOrphanedMeshes();
      this._lastCleanupTime = 0;
    }

    // Periodically update block meshes (every 1 second)
    if (!this._lastMeshUpdateTime) {
      this._lastMeshUpdateTime = 0;
    }

    this._lastMeshUpdateTime += deltaTime;
    if (this._lastMeshUpdateTime > 1) {
      this.renderer.updateBlockMeshes();
      this._lastMeshUpdateTime = 0;
    }
  }

  /**
   * Get the camera position and target for Ship Mode
   * @param {Number} distance - Distance behind the steering wheel
   * @param {Number} height - Height above the steering wheel
   * @returns {Object} - The camera position and target {position, target}
   */
  getCameraPositionAndTarget(distance = 10, height = 5) {
    // Calculate camera position based on ship position and rotation
    const position = {
      x: this.position.x - Math.sin(this.rotation) * distance,
      y: this.position.y + height,
      z: this.position.z - Math.cos(this.rotation) * distance
    };
    
    // Calculate target position (looking at the ship)
    const target = {
      x: this.position.x + Math.sin(this.rotation) * 20, // Look ahead of the ship
      y: this.position.y,
      z: this.position.z + Math.cos(this.rotation) * 20
    };
    
    return { position, target };
  }

  /**
   * Get the total number of blocks in the ship
   * @returns {Number} - The total number of blocks
   */
  getBlockCount() {
    return this.blockManager.getBlockCount();
  }

  /**
   * Get the number of blocks of a specific type
   * @param {String} type - The type of block to count
   * @returns {Number} - The number of blocks of the specified type
   */
  getBlockCountByType(type) {
    return this.blockManager.getBlockCountByType(type);
  }

  /**
   * Serialize the ship to a JSON-compatible format
   * @returns {Object} The serialized ship
   */
  serialize() {
    return this.serialization.serialize();
  }

  /**
   * Break a block at the given position
   * @param {Object} position - The position of the block to break
   * @param {Object} options - Additional options
   * @returns {Object|null} - The broken block or null if no block was broken
   */
  breakBlock(position, options = {}) {
    return this.blockManager.breakBlock(position, options);
  }

  /**
   * Get the position of a block in world space
   * @param {Object} block - The block to get the position of
   * @returns {Object} - The world position {x, y, z}
   */
  getBlockWorldPosition(block) {
    return this.blockManager.getBlockWorldPosition(block);
  }

  /**
   * Convert a world position to a ship-local position
   * @param {Object} worldPos - The world position {x, y, z}
   * @returns {Object} - The local position {x, y, z}
   */
  worldToLocalPosition(worldPos) {
    return this.transform.worldToLocalPosition(worldPos);
  }

  localToWorldPosition(localPos) {
    return this.transform.localToWorldPosition(localPos);
  }

  /**
   * Convert a world direction to a ship-local direction
   * @param {Object} worldDir - The world direction {x, y, z}
   * @returns {Object} - The local direction {x, y, z}
   */
  worldToLocalDirection(worldDir) {
    return this.transform.worldToLocalDirection(worldDir);
  }

  /**
   * Ensure the ship is properly initialized and visible
   * @param {THREE.Scene} scene - The scene to add the ship to if not already added
   */
  ensureVisible(scene) {
    console.log(`Ensuring ship ${this.name} is visible`);
    
    // Check if the group is in the scene
    if (scene && !this.group.parent) {
      console.log(`Adding ship ${this.name} to scene`);
      scene.add(this.group);
    }
    
    // Make sure the group is visible
    this.group.visible = true;
    
    // Update position and rotation
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.rotation;
    
    // Force update the world matrix
    this.group.updateMatrixWorld(true);
    
    // Check if we have blocks
    if (this.blockManager.blocks.length === 0) {
      console.warn(`Ship ${this.name} has no blocks!`);
    } else {
      console.log(`Ship ${this.name} has ${this.blockManager.blocks.length} blocks`);
      
      // Update block meshes
      this.renderer.updateBlockMeshes();
    }
    
    return this;
  }

  /**
   * Get a block at the given local position
   * @param {Object} localPos - The local position {x, y, z}
   * @returns {Object|undefined} - The block at the position or undefined if no block exists
   */
  getBlockAtLocalPosition(localPos) {
    return this.blockManager.getBlockAtLocalPosition(localPos);
  }

  /**
   * Validate and fix block-mesh position consistency
   * This ensures that block meshes are positioned correctly according to their logical positions
   * @returns {Number} - The number of fixed positions
   */
  validateBlockMeshPositions() {
    return this.renderer.validateBlockMeshPositions();
  }

  /**
   * Fix texture issues with blocks
   * @returns {Number} - The number of fixed textures
   */
  fixBlockTextureIssues() {
    return this.renderer.fixBlockTextureIssues();
  }

  /**
   * Clean up orphaned meshes and ensure block-mesh consistency
   * @returns {Object} - Statistics about the cleanup operation
   */
  cleanupOrphanedMeshes() {
    return this.renderer.cleanupOrphanedMeshes();
  }
}

export default Ship; 