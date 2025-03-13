/**
 * Ship Class
 * 
 * Manages a collection of blocks that make up a ship.
 * Handles ship movement, rotation, and physics.
 */

import * as THREE from 'three';
import BlockFactory from '../blocks/blockFactory.js';

class Ship {
  /**
   * Constructor for the Ship class
   * @param {Object} options - Options for the ship
   */
  constructor(options = {}) {
    this.blocks = []; // Array of all blocks in the ship
    this.position = options.position || { x: 0, y: 100, z: 0 }; // Ship position in world
    this.rotation = options.rotation || 0; // Ship rotation (radians)
    this.velocity = { x: 0, y: 0, z: 0 }; // Current velocity
    this.angularVelocity = 0; // Current turning speed
    this.owner = options.owner || null; // Player who owns this ship
    this.name = options.name || 'Unnamed Ship';
    this.isSinking = false; // Whether the ship is currently sinking
    this.sinkRate = 1; // Rate at which the ship sinks (blocks/second)
    this.controls = { forward: false, backward: false, left: false, right: false, up: false, down: false }; // Control inputs
    
    // Group to hold all block meshes
    this.group = new THREE.Group();
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.rotation;
    
    // Reference to the steering wheel block
    this.steeringWheel = null;
  }

  /**
   * Load ship from a definition object
   * @param {Object} definition - The ship definition
   * @param {Object} options - Additional options
   * @returns {boolean} - Whether the load was successful
   */
  loadFromDefinition(definition, options = {}) {
    console.log("Loading ship from definition:", definition);
    
    if (!definition || !definition.blocks || !Array.isArray(definition.blocks)) {
      console.error("Invalid ship definition");
      return false;
    }
    
    // Clear existing blocks
    this.clearBlocks();
    
    // Set ship properties
    if (definition.name) this.name = definition.name;
    if (definition.owner) this.owner = definition.owner;
    
    // Set position if provided
    if (definition.position) {
      this.position.x = definition.position.x || 0;
      this.position.y = definition.position.y || 0;
      this.position.z = definition.position.z || 0;
      
      // Update the group position
      this.group.position.set(this.position.x, this.position.y, this.position.z);
    }
    
    // Set rotation if provided
    if (definition.rotation !== undefined) {
      this.rotation = definition.rotation;
      this.group.rotation.y = this.rotation;
    }
    
    // Create blocks
    const blockFactory = new BlockFactory();
    
    for (const blockDef of definition.blocks) {
      try {
        const block = blockFactory.createBlock(
          blockDef.type,
          blockDef.position,
          {
            rotation: blockDef.rotation || 0,
            health: blockDef.health
          }
        );
        
        if (block) {
          this.blocks.push(block);
          
          // Create mesh for the block
          if (window.resourceLoader) {
            block.createMesh(this.group, window.resourceLoader);
          } else {
            console.warn(`No resource loader available for block ${block.type}`);
          }
        } else {
          console.warn(`Failed to create block of type ${blockDef.type}`);
        }
      } catch (error) {
        console.error(`Error creating block: ${error.message}`);
      }
    }
    
    console.log(`Loaded ${this.blocks.length} blocks`);
    
    // Update block meshes to ensure they're positioned correctly
    this.updateBlockMeshes();
    
    // Fix any texture issues that might have occurred during loading
    this.fixBlockTextureIssues();
    
    // Save to local storage if needed
    if (options.saveToLocalStorage && this.owner) {
      this.saveToLocalStorage();
    }
    
    return true;
  }

  /**
   * Add a block to the ship
   * @param {Object} block - The block to add
   * @param {THREE.TextureLoader} textureLoader - Texture loader for block textures
   */
  addBlock(block, textureLoader) {
    this.blocks.push(block);
    
    // Create mesh and add to the group
    block.createMesh(this.group, textureLoader);
    
    // If it's a steering wheel, store a reference
    if (block.type === 'steeringWheel') {
      this.steeringWheel = block;
    }
    
    // Check if the ship has enough lift
    this.checkLift();
  }

  /**
   * Remove a block from the ship
   * @param {Object} position - The position of the block to remove
   * @returns {boolean} - Whether the block was removed
   */
  removeBlock(position) {
    console.log(`Attempting to remove block at position: ${JSON.stringify(position)}`);
    
    // Find the block at the given position
    const blockIndex = this.blocks.findIndex(block => 
      block.position.x === position.x &&
      block.position.y === position.y &&
      block.position.z === position.z
    );
    
    if (blockIndex === -1) {
      console.warn(`No block found at position ${JSON.stringify(position)}`);
      return false;
    }
    
    const block = this.blocks[blockIndex];
    
    // Check if this is a critical block (e.g., steering wheel)
    if (block.type === 'control') {
      console.warn("Cannot remove steering wheel block");
      return false;
    }
    
    // Remove the block's mesh from the group
    if (block.mesh) {
      if (block.mesh.parent) {
        block.mesh.parent.remove(block.mesh);
      }
      
      // Dispose of geometry and material to free memory
      if (block.mesh.geometry) {
        block.mesh.geometry.dispose();
      }
      
      if (block.mesh.material) {
        if (Array.isArray(block.mesh.material)) {
          block.mesh.material.forEach(material => material.dispose());
        } else {
          block.mesh.material.dispose();
        }
      }
    }
    
    // Remove the block from the blocks array
    this.blocks.splice(blockIndex, 1);
    
    console.log(`Block removed from position ${JSON.stringify(position)}`);
    
    // Check if the ship still has enough lift
    this.checkLift();
    
    // Fix any texture issues that might have occurred during removal
    this.fixBlockTextureIssues();
    
    return true;
  }

  /**
   * Check if the ship has enough lift blocks (at least 30% of total)
   */
  checkLift() {
    const hasEnoughLift = BlockFactory.hasEnoughLift(this.blocks);
    
    if (!hasEnoughLift && !this.isSinking) {
      // Start sinking
      this.startSinking();
    } else if (hasEnoughLift && this.isSinking) {
      // Stop sinking
      this.stopSinking();
    }
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
   * Apply thrust from all engine blocks
   * @param {Object} controls - Control inputs {forward, backward, left, right, up, down}
   */
  applyThrust(controls) {
    // Reset velocity
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = 0;
    
    // Find all engine blocks
    const engineBlocks = this.blocks.filter(block => block.type === 'engine');
    
    // Activate/deactivate engines based on controls
    for (const engine of engineBlocks) {
      let isActive = false;
      
      // Check if this engine should be active based on its direction and controls
      if (engine.direction.z === -1 && controls.forward) {
        isActive = true;
      } else if (engine.direction.z === 1 && controls.backward) {
        isActive = true;
      } else if (engine.direction.x === -1 && controls.left) {
        isActive = true;
      } else if (engine.direction.x === 1 && controls.right) {
        isActive = true;
      }
      
      // Set engine active state
      engine.setActive(isActive);
      
      // Apply thrust if active
      if (isActive) {
        const thrust = engine.calculateThrust();
        
        // Apply to ship velocity (rotated by ship rotation)
        const rotatedThrust = this.rotateVector(thrust);
        this.velocity.x += rotatedThrust.x;
        this.velocity.z += rotatedThrust.z;
        
        // Apply turning force if side engines
        if (engine.direction.x !== 0) {
          this.angularVelocity += engine.direction.x * 0.02; // Adjust turning speed
        }
      }
    }
    
    // Store controls for use in update method
    this.controls = controls;
    
    // Cap velocities
    const maxSpeed = 5;
    const maxAngularSpeed = Math.PI / 2; // 90 degrees per second
    
    this.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.x));
    this.velocity.z = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.z));
    this.angularVelocity = Math.max(-maxAngularSpeed, Math.min(maxAngularSpeed, this.angularVelocity));
  }

  /**
   * Rotate a vector by the ship's rotation
   * @param {Object} vector - The vector to rotate {x, y, z}
   * @returns {Object} - The rotated vector {x, y, z}
   */
  rotateVector(vector) {
    const sin = Math.sin(this.rotation);
    const cos = Math.cos(this.rotation);
    
    return {
      x: vector.x * cos - vector.z * sin,
      y: vector.y,
      z: vector.x * sin + vector.z * cos
    };
  }

  /**
   * Fire all cannons facing a particular direction
   * @param {String} direction - The direction to fire ('forward', 'backward', 'left', 'right')
   * @param {THREE.Scene} scene - The scene to add projectiles to
   * @returns {Array} - Array of projectiles fired
   */
  fireCannons(direction, scene) {
    const projectiles = [];
    
    // Find all cannon blocks
    const cannonBlocks = this.blocks.filter(block => block.type === 'cannon');
    
    // Determine which cannons to fire based on direction
    for (const cannon of cannonBlocks) {
      let shouldFire = false;
      
      // Check if this cannon is facing the requested direction
      if (direction === 'forward' && cannon.direction.z === -1) {
        shouldFire = true;
      } else if (direction === 'backward' && cannon.direction.z === 1) {
        shouldFire = true;
      } else if (direction === 'left' && cannon.direction.x === -1) {
        shouldFire = true;
      } else if (direction === 'right' && cannon.direction.x === 1) {
        shouldFire = true;
      }
      
      // Fire the cannon if it should fire
      if (shouldFire) {
        const projectile = cannon.fire(scene, this.velocity);
        
        if (projectile) {
          projectiles.push(projectile);
        }
      }
    }
    
    return projectiles;
  }

  /**
   * Update the ship
   * @param {number} deltaTime - The time since the last update in seconds
   * @param {number} worldHeight - The maximum height of the world
   */
  update(deltaTime, worldHeight = 500) {
    // Handle vertical movement directly from controls - SIMPLIFIED
    // We're now handling this in the Player class, so this is just a backup
    
    // Apply physics
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
    
    // Apply angular velocity
    this.rotation += this.angularVelocity * deltaTime;
    
    // Apply drag
    const drag = 0.95;
    this.velocity.x *= drag;
    this.velocity.z *= drag;
    this.angularVelocity *= drag;
    
    // Apply bobbing motion when not moving AND not actively changing altitude
    const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1;
    const isChangingAltitude = this.controls && (this.controls.up || this.controls.down);
    
    if (!isMoving && !isChangingAltitude && !this.isSinking) {
      // Store the base Y position if we don't have one yet
      if (!this.baseY) {
        this.baseY = this.position.y;
      }
      
      // Calculate bobbing based on time
      const time = performance.now() / 1000; // Current time in seconds
      // Faster, subtle bobbing for airship/balloon-like motion
      const bobOffset = Math.sin(time * 0.7) * 0.5; // Faster, subtle bobbing effect with 0.5 block amplitude
      
      // Set position directly based on base position plus offset
      this.position.y = this.baseY + bobOffset;
      
      // Reset velocity since we're directly setting position
      this.velocity.y = 0;
    } else {
      // Reset baseY when moving so it can be recalculated when stopped
      this.baseY = null;
    }
    
    // Apply gravity if sinking
    if (this.isSinking) {
      this.velocity.y -= this.sinkRate * deltaTime;
    }
    
    // Enforce world boundaries
    const worldRadius = 500;
    const distance = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    
    if (distance > worldRadius) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * worldRadius;
      this.position.z = Math.sin(angle) * worldRadius;
      
      // Bounce back
      this.velocity.x *= -0.5;
      this.velocity.z *= -0.5;
    }
    
    // Enforce world height
    if (this.position.y > worldHeight) {
      this.position.y = worldHeight;
      this.velocity.y = 0;
    }
    
    // Check for ground impact
    if (this.position.y < 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      
      // Destroy ship on impact if moving fast enough
      if (this.velocity.y < -10) {
        this.destroyOnGroundImpact();
      }
    }
    
    // Update group position and rotation
    if (this.group) {
      this.group.position.set(this.position.x, this.position.y, this.position.z);
      this.group.rotation.y = this.rotation;
      
      // Ensure the group is visible
      this.group.visible = true;
      
      // Log position periodically
      if (Math.random() < 0.01) {
        console.log(`Ship position: ${JSON.stringify(this.position)}`);
        console.log(`Ship group position: ${JSON.stringify({
          x: this.group.position.x,
          y: this.group.position.y,
          z: this.group.position.z
        })}`);
      }
    }
    
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
      this.cleanupOrphanedMeshes();
      this._lastCleanupTime = 0;
    }
    
    // Periodically update block meshes (every 1 second)
    if (!this._lastMeshUpdateTime) {
      this._lastMeshUpdateTime = 0;
    }
    
    this._lastMeshUpdateTime += deltaTime;
    if (this._lastMeshUpdateTime > 1) {
      this.updateBlockMeshes();
      this._lastMeshUpdateTime = 0;
    }
  }

  /**
   * Destroy the ship when it hits the ground while sinking
   */
  destroyOnGroundImpact() {
    console.log(`Ship "${this.name}" has crashed into the ground!`);
    
    // In a full implementation, this would trigger explosion effects
    // and respawn the player with a new ship
    
    // For now, just log the event
    if (this.owner) {
      this.owner.deaths++;
      console.log(`${this.owner.username} has died. Deaths: ${this.owner.deaths}`);
    }
  }

  /**
   * Transform a position from ship-local coordinates to world coordinates
   * @param {Object} localPos - The position in ship-local coordinates {x, y, z}
   * @returns {Object} - The position in world coordinates {x, y, z}
   */
  localToWorldPosition(localPos) {
    const sin = Math.sin(this.rotation);
    const cos = Math.cos(this.rotation);
    
    return {
      x: this.position.x + (localPos.x * cos - localPos.z * sin),
      y: this.position.y + localPos.y,
      z: this.position.z + (localPos.x * sin + localPos.z * cos)
    };
  }

  /**
   * Transform a position from world coordinates to ship-local coordinates
   * @param {Object} worldPos - The position in world coordinates {x, y, z}
   * @returns {Object} - The position in ship-local coordinates {x, y, z}
   */
  worldToLocalPosition(worldPos) {
    // Translate to origin
    const translatedPos = {
      x: worldPos.x - this.position.x,
      y: worldPos.y - this.position.y,
      z: worldPos.z - this.position.z
    };
    
    // Rotate around Y axis (inverse of ship rotation)
    const sin = Math.sin(-this.rotation);
    const cos = Math.cos(-this.rotation);
    
    return {
      x: translatedPos.x * cos - translatedPos.z * sin,
      y: translatedPos.y,
      z: translatedPos.x * sin + translatedPos.z * cos
    };
  }

  /**
   * Get the position of a block in world space
   * @param {Object} block - The block to get the position of
   * @returns {Object} - The world position {x, y, z}
   */
  getBlockWorldPosition(block) {
    return this.localToWorldPosition(block.position);
  }

  /**
   * Find a block at the specified local position
   * @param {Object} localPos - The position in ship-local coordinates {x, y, z}
   * @returns {Object|null} - The block at the position, or null if no block exists
   */
  getBlockAtLocalPosition(localPos) {
    // Round positions to ensure integer grid coordinates
    const gridPos = {
      x: Math.round(localPos.x),
      y: Math.round(localPos.y),
      z: Math.round(localPos.z)
    };
    
    return this.blocks.find(block => 
      Math.round(block.position.x) === gridPos.x &&
      Math.round(block.position.y) === gridPos.y &&
      Math.round(block.position.z) === gridPos.z
    );
  }

  /**
   * Find a block at the specified world position
   * @param {Object} worldPos - The position in world coordinates {x, y, z}
   * @returns {Object|null} - The block at the position, or null if no block exists
   */
  getBlockAtWorldPosition(worldPos) {
    const localPos = this.worldToLocalPosition(worldPos);
    return this.getBlockAtLocalPosition(localPos);
  }

  /**
   * Check if a block exists at the specified local position
   * @param {Object} localPos - The position in ship-local coordinates {x, y, z}
   * @returns {Boolean} - Whether a block exists at the position
   */
  hasBlockAtLocalPosition(localPos) {
    return this.getBlockAtLocalPosition(localPos) !== undefined;
  }

  /**
   * Check if a block exists at the specified world position
   * @param {Object} worldPos - The position in world coordinates {x, y, z}
   * @returns {Boolean} - Whether a block exists at the position
   */
  hasBlockAtWorldPosition(worldPos) {
    return this.getBlockAtWorldPosition(worldPos) !== undefined;
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
    return this.blocks.length;
  }

  /**
   * Get the number of blocks of a specific type
   * @param {String} type - The type of block to count
   * @returns {Number} - The number of blocks of the specified type
   */
  getBlockCountByType(type) {
    return this.blocks.filter(block => block.type === type).length;
  }

  /**
   * Serialize the ship to a JSON-compatible format
   * @returns {Object} The serialized ship
   */
  serialize() {
    return {
      name: this.name,
      position: { ...this.position },
      rotation: this.rotation,
      blocks: this.blocks.map(block => ({
        type: block.type,
        position: { ...block.position },
        rotation: block.rotation || 0
      }))
    };
  }

  /**
   * Validate and fix block-mesh position consistency
   * This ensures that block meshes are positioned correctly according to their logical positions
   */
  validateBlockMeshPositions() {
    console.log("Validating block-mesh positions...");
    
    let fixedCount = 0;
    
    for (const block of this.blocks) {
      if (!block.mesh) continue;
      
      // The mesh position should match the block's logical position
      // No need to apply ship rotation here as the mesh is a child of the ship group
      // which already has the rotation applied
      const expectedPosition = {
        x: block.position.x,
        y: block.position.y,
        z: block.position.z
      };
      
      // Check if the mesh position matches the expected position
      const currentPosition = {
        x: block.mesh.position.x,
        y: block.mesh.position.y,
        z: block.mesh.position.z
      };
      
      // Calculate the difference
      const diff = {
        x: Math.abs(currentPosition.x - expectedPosition.x),
        y: Math.abs(currentPosition.y - expectedPosition.y),
        z: Math.abs(currentPosition.z - expectedPosition.z)
      };
      
      // If the difference is significant, fix the mesh position
      const threshold = 0.01; // Small threshold to account for floating point errors
      if (diff.x > threshold || diff.y > threshold || diff.z > threshold) {
        console.log(`Fixing mesh position for block at ${JSON.stringify(block.position)}`);
        console.log(`  Current: ${JSON.stringify(currentPosition)}`);
        console.log(`  Expected: ${JSON.stringify(expectedPosition)}`);
        
        // Set the mesh position to match the block position
        block.mesh.position.set(
          expectedPosition.x,
          expectedPosition.y,
          expectedPosition.z
        );
        
        fixedCount++;
      }
    }
    
    console.log(`Validation complete. Fixed ${fixedCount} block mesh positions.`);
    return fixedCount;
  }

  /**
   * Clean up orphaned meshes and ensure block-mesh consistency
   * This should be called periodically to prevent ghost blocks
   */
  cleanupOrphanedMeshes() {
    console.log("Cleaning up orphaned meshes...");
    
    // Step 1: Find all meshes in the group
    const meshes = [];
    this.group.traverse(child => {
      if (child.isMesh && child.userData.isBlock) {
        meshes.push(child);
      }
    });
    
    console.log(`Found ${meshes.length} meshes in ship group`);
    
    // Step 2: Check each mesh to see if it has a corresponding block
    let orphanedMeshCount = 0;
    for (const mesh of meshes) {
      // Get the world position of the mesh
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      
      // Convert to ship-local coordinates
      const localPos = this.worldToLocalPosition({
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z
      });
      
      // Round to grid coordinates
      const gridPos = {
        x: Math.round(localPos.x),
        y: Math.round(localPos.y),
        z: Math.round(localPos.z)
      };
      
      // Check if there's a block at this position
      const blockExists = this.getBlockAtLocalPosition(gridPos);
      
      // If no block exists at this position, remove the mesh
      if (!blockExists) {
        console.log(`Removing orphaned mesh at local position: ${gridPos.x}, ${gridPos.y}, ${gridPos.z}`);
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }
        orphanedMeshCount++;
      }
    }
    
    // Step 3: Check for blocks without meshes
    let blocksWithoutMeshCount = 0;
    for (const block of this.blocks) {
      if (!block.mesh || !block.mesh.parent) {
        console.log(`Found block without mesh at position: ${block.position.x}, ${block.position.y}, ${block.position.z}`);
        blocksWithoutMeshCount++;
        
        // Recreate the mesh for this block if we have a resource loader
        if (window.resourceLoader) {
          block.createMesh(this.group, window.resourceLoader);
          console.log("Recreated mesh for block");
        }
      }
    }
    
    // Step 4: Validate and fix block-mesh positions
    const fixedPositionsCount = this.validateBlockMeshPositions();
    
    console.log(`Cleanup complete. Removed ${orphanedMeshCount} orphaned meshes, found ${blocksWithoutMeshCount} blocks without meshes, and fixed ${fixedPositionsCount} mesh positions.`);
    
    return { orphanedMeshCount, blocksWithoutMeshCount, fixedPositionsCount };
  }

  /**
   * Update all block meshes to match their logical positions
   * This ensures visual representation matches the logical state
   */
  updateBlockMeshes() {
    console.log("Updating block meshes...");
    
    // Helper function to get default color for a block type
    const getDefaultColorForType = (type) => {
      switch (type.toLowerCase()) {
        case 'wood': return 0x8B4513;
        case 'stone': return 0x808080;
        case 'lift': return 0xFFD700;
        case 'cannon': return 0x696969;
        case 'control': return 0x8B0000;
        default: return 0xAAAAAA;
      }
    };
    
    let updatedCount = 0;
    
    for (const block of this.blocks) {
      if (!block.mesh) {
        console.log(`Block at position ${JSON.stringify(block.position)} has no mesh, attempting to create one`);
        
        // Try to create a mesh if we have a resource loader
        if (window.resourceLoader) {
          try {
            block.createMesh(this.group, window.resourceLoader);
            console.log(`Created mesh for block at position ${JSON.stringify(block.position)}`);
            updatedCount++;
          } catch (error) {
            console.error(`Failed to create mesh for block at position ${JSON.stringify(block.position)}:`, error);
          }
        } else {
          console.warn(`Cannot create mesh for block at position ${JSON.stringify(block.position)} - no resource loader available`);
        }
        
        continue;
      }
      
      // Set the mesh position to match the block's logical position
      block.mesh.position.set(
        block.position.x,
        block.position.y,
        block.position.z
      );
      
      // Set rotation if specified
      if (block.rotation) {
        block.mesh.rotation.y = block.rotation;
      }
      
      // Check if the mesh has a material
      if (!block.mesh.material) {
        console.warn(`Block at position ${JSON.stringify(block.position)} has no material, attempting to create one`);
        
        // Try to create a material if we have a resource loader
        if (window.resourceLoader) {
          try {
            const texture = window.resourceLoader.get(block.type);
            if (texture) {
              block.mesh.material = new THREE.MeshStandardMaterial({ 
                map: texture,
                roughness: 0.7,
                metalness: 0.2
              });
              console.log(`Created material with texture for block at position ${JSON.stringify(block.position)}`);
            } else {
              // Use default color if texture loading failed
              const color = block.getDefaultColor ? block.getDefaultColor() : getDefaultColorForType(block.type);
              block.mesh.material = new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.7,
                metalness: 0.2
              });
              console.log(`Created material with default color for block at position ${JSON.stringify(block.position)}`);
            }
            updatedCount++;
          } catch (error) {
            console.error(`Failed to create material for block at position ${JSON.stringify(block.position)}:`, error);
          }
        }
      }
      
      // Ensure the mesh has the correct userData
      block.mesh.userData.block = block;
      block.mesh.userData.isBlock = true;
      block.mesh.userData.type = block.type;
      block.mesh.userData.gridPosition = { ...block.position };
      
      updatedCount++;
    }
    
    // Force update the world matrix to ensure correct positioning
    this.group.updateMatrixWorld(true);
    
    console.log(`Updated ${updatedCount} block meshes`);
    return updatedCount;
  }

  /**
   * Fix texture issues with blocks
   * This method specifically targets known issues like blocks above the steering wheel
   * turning gray
   */
  fixBlockTextureIssues() {
    console.log("Fixing block texture issues...");
    
    // Helper function to get default color for a block type
    const getDefaultColorForType = (type) => {
      switch (type.toLowerCase()) {
        case 'wood': return 0x8B4513;
        case 'stone': return 0x808080;
        case 'lift': return 0xFFD700;
        case 'cannon': return 0x696969;
        case 'control': return 0x8B0000;
        default: return 0xAAAAAA;
      }
    };
    
    let fixedCount = 0;
    
    // Find the steering wheel block
    const steeringWheel = this.blocks.find(block => block.type === 'control');
    
    if (steeringWheel) {
      console.log("Found steering wheel at position:", steeringWheel.position);
      
      // Check blocks above the steering wheel
      const blocksAboveSteeringWheel = this.blocks.filter(block => 
        block.position.x === steeringWheel.position.x &&
        block.position.z === steeringWheel.position.z &&
        block.position.y > steeringWheel.position.y
      );
      
      console.log(`Found ${blocksAboveSteeringWheel.length} blocks above the steering wheel`);
      
      // Fix textures for these blocks
      for (const block of blocksAboveSteeringWheel) {
        if (!block.mesh) continue;
        
        console.log(`Checking block of type ${block.type} at position:`, block.position);
        
        // Check if the material is missing or incorrect
        const hasMissingTexture = !block.mesh.material || 
                                 !block.mesh.material.map ||
                                 (block.mesh.material.color && block.mesh.material.color.getHex() === 0xAAAAAA);
        
        if (hasMissingTexture) {
          console.log(`Block at position ${JSON.stringify(block.position)} has texture issues, fixing...`);
          
          // Try to create a new material with the correct texture
          if (window.resourceLoader) {
            try {
              const texture = window.resourceLoader.get(block.type);
              if (texture) {
                // Dispose of old material if it exists
                if (block.mesh.material) {
                  block.mesh.material.dispose();
                }
                
                // Create new material with texture
                block.mesh.material = new THREE.MeshStandardMaterial({ 
                  map: texture,
                  roughness: 0.7,
                  metalness: 0.2
                });
                console.log(`Fixed texture for block at position ${JSON.stringify(block.position)}`);
                fixedCount++;
              } else {
                // Use default color if texture loading failed
                const color = block.getDefaultColor ? block.getDefaultColor() : getDefaultColorForType(block.type);
                
                // Dispose of old material if it exists
                if (block.mesh.material) {
                  block.mesh.material.dispose();
                }
                
                // Create new material with default color
                block.mesh.material = new THREE.MeshStandardMaterial({ 
                  color: color,
                  roughness: 0.7,
                  metalness: 0.2
                });
                console.log(`Created material with default color for block at position ${JSON.stringify(block.position)}`);
                fixedCount++;
              }
            } catch (error) {
              console.error(`Failed to fix texture for block at position ${JSON.stringify(block.position)}:`, error);
            }
          }
        }
      }
    }
    
    // Also check for any blocks with missing or incorrect textures
    for (const block of this.blocks) {
      if (!block.mesh) continue;
      
      // Skip blocks we've already checked (above the steering wheel)
      if (steeringWheel && 
          block.position.x === steeringWheel.position.x &&
          block.position.z === steeringWheel.position.z &&
          block.position.y > steeringWheel.position.y) {
        continue;
      }
      
      // Check if the material is missing or incorrect
      const hasMissingTexture = !block.mesh.material || 
                               !block.mesh.material.map ||
                               (block.mesh.material.color && block.mesh.material.color.getHex() === 0xAAAAAA);
      
      if (hasMissingTexture) {
        console.log(`Block of type ${block.type} at position ${JSON.stringify(block.position)} has texture issues, fixing...`);
        
        // Try to create a new material with the correct texture
        if (window.resourceLoader) {
          try {
            const texture = window.resourceLoader.get(block.type);
            if (texture) {
              // Dispose of old material if it exists
              if (block.mesh.material) {
                block.mesh.material.dispose();
              }
              
              // Create new material with texture
              block.mesh.material = new THREE.MeshStandardMaterial({ 
                map: texture,
                roughness: 0.7,
                metalness: 0.2
              });
              console.log(`Fixed texture for block at position ${JSON.stringify(block.position)}`);
              fixedCount++;
            } else {
              // Use default color if texture loading failed
              const color = block.getDefaultColor ? block.getDefaultColor() : getDefaultColorForType(block.type);
              
              // Dispose of old material if it exists
              if (block.mesh.material) {
                block.mesh.material.dispose();
              }
              
              // Create new material with default color
              block.mesh.material = new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.7,
                metalness: 0.2
              });
              console.log(`Created material with default color for block at position ${JSON.stringify(block.position)}`);
              fixedCount++;
            }
          } catch (error) {
            console.error(`Failed to fix texture for block at position ${JSON.stringify(block.position)}:`, error);
          }
        }
      }
    }
    
    console.log(`Fixed textures for ${fixedCount} blocks`);
    return fixedCount;
  }

  /**
   * Break a block at the given position
   * @param {Object} position - The position of the block to break
   * @param {Object} options - Additional options
   * @returns {Object|null} - The broken block or null if no block was broken
   */
  breakBlock(position, options = {}) {
    console.log(`Breaking block at position: ${JSON.stringify(position)}`);
    
    // Find the block at the given position
    const block = this.blocks.find(block => 
      block.position.x === position.x &&
      block.position.y === position.y &&
      block.position.z === position.z
    );
    
    if (!block) {
      console.warn(`No block found at position ${JSON.stringify(position)}`);
      return null;
    }
    
    // Check if this is a critical block (e.g., steering wheel)
    if (block.type === 'control' && !options.allowBreakingCritical) {
      console.warn("Cannot break steering wheel block");
      return null;
    }
    
    // Remove the block
    const removed = this.removeBlock(position);
    
    if (!removed) {
      console.warn(`Failed to remove block at position ${JSON.stringify(position)}`);
      return null;
    }
    
    // Create a drop if specified
    if (options.createDrop && typeof options.createDrop === 'function') {
      options.createDrop(block);
    }
    
    // Fix any texture issues that might have occurred during breaking
    this.fixBlockTextureIssues();
    
    return block;
  }
}

export default Ship; 