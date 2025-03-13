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
   * Load a ship from a definition file
   * @param {Object} shipDefinition - The ship definition object
   * @param {THREE.Scene} scene - The Three.js scene
   * @param {Object} resourceLoader - Resource loader for textures
   */
  loadFromDefinition(shipDefinition, scene, resourceLoader) {
    try {
      // Clear existing blocks
      this.blocks = [];
      
      // Remove existing meshes from the group
      while (this.group.children.length > 0) {
        this.group.remove(this.group.children[0]);
      }
      
      // Create blocks from the definition
      this.blocks = BlockFactory.createBlocksFromShipDefinition(shipDefinition);
      
      console.log(`Creating ${this.blocks.length} blocks for ship "${shipDefinition.name}"`);
      
      // Create meshes for each block and add to the group
      for (const block of this.blocks) {
        block.createMesh(this.group, resourceLoader);
        
        // Store reference to steering wheel
        if (block.type === 'control') {
          this.steeringWheel = block;
        }
      }
      
      // Ensure the group is visible
      this.group.visible = true;
      
      // Add the group to the scene
      scene.add(this.group);
      
      console.log(`Ship group added to scene with ${this.group.children.length} children`);
      console.log(`Ship position: ${JSON.stringify(this.position)}`);
      console.log(`Ship group position: ${JSON.stringify({
        x: this.group.position.x,
        y: this.group.position.y,
        z: this.group.position.z
      })}`);
      
      // Set the ship name if provided
      if (shipDefinition.name) {
        this.name = shipDefinition.name;
      }
      
      // Check if the ship has enough lift
      this.checkLift();
      
      console.log(`Ship "${this.name}" loaded successfully with ${this.blocks.length} blocks`);
    } catch (error) {
      console.error(`Error loading ship from definition:`, error);
      
      // Create a simple default block as fallback
      const defaultBlock = BlockFactory.createBlock('control', { x: 0, y: 0, z: 0 });
      this.blocks = [defaultBlock];
      
      // Create mesh for the default block
      try {
        defaultBlock.createMesh(this.group, resourceLoader);
        
        // Ensure the group is visible
        this.group.visible = true;
        
        // Add the group to the scene
        scene.add(this.group);
        
        console.log('Default block created and added to scene');
      } catch (meshError) {
        console.error('Error creating default block mesh:', meshError);
      }
    }
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
   * @param {Object} block - The block to remove
   * @returns {Boolean} - Whether the block was successfully removed
   */
  removeBlock(block) {
    const index = this.blocks.indexOf(block);
    
    if (index === -1) {
      console.warn('Block not found in ship blocks array');
      
      // Try to find the block by position
      const blockByPosition = this.blocks.find(b => 
        b.position.x === block.position.x && 
        b.position.y === block.position.y && 
        b.position.z === block.position.z
      );
      
      if (blockByPosition) {
        console.log('Found block by position instead');
        return this.removeBlock(blockByPosition);
      }
      
      return false;
    }
    
    // Don't allow removing the steering wheel or control block
    if (block.type === 'steeringWheel' || block.type === 'control') {
      console.warn('Cannot remove the steering wheel or control block');
      return false;
    }
    
    // Remove the block from the blocks array
    this.blocks.splice(index, 1);
    
    // Remove the mesh from the group
    if (block.mesh) {
      if (block.mesh.parent) {
        block.mesh.parent.remove(block.mesh);
      }
      
      // Dispose of geometry and materials to prevent memory leaks
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
      
      // Clear references
      block.mesh.userData = {};
      block.mesh = null;
    }
    
    // Check if the ship has enough lift
    this.checkLift();
    
    console.log(`Block removed from ship at position: ${block.position.x}, ${block.position.y}, ${block.position.z}`);
    
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
   * Get the position of a block in world space
   * @param {Object} block - The block to get the position of
   * @returns {Object} - The world position {x, y, z}
   */
  getBlockWorldPosition(block) {
    // Calculate the block's position relative to the ship's position and rotation
    const relX = block.position.x;
    const relY = block.position.y;
    const relZ = block.position.z;
    
    const sin = Math.sin(this.rotation);
    const cos = Math.cos(this.rotation);
    
    return {
      x: this.position.x + (relX * cos - relZ * sin),
      y: this.position.y + relY,
      z: this.position.z + (relX * sin + relZ * cos)
    };
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
      // Get the position from the mesh
      const meshPos = {
        x: Math.round(mesh.position.x),
        y: Math.round(mesh.position.y),
        z: Math.round(mesh.position.z)
      };
      
      // Check if there's a block at this position
      const blockExists = this.blocks.some(block => 
        block.position.x === meshPos.x &&
        block.position.y === meshPos.y &&
        block.position.z === meshPos.z
      );
      
      // If no block exists at this position, remove the mesh
      if (!blockExists) {
        console.log(`Removing orphaned mesh at position: ${meshPos.x}, ${meshPos.y}, ${meshPos.z}`);
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
    
    console.log(`Cleanup complete. Removed ${orphanedMeshCount} orphaned meshes and found ${blocksWithoutMeshCount} blocks without meshes.`);
    
    return { orphanedMeshCount, blocksWithoutMeshCount };
  }
}

export default Ship; 