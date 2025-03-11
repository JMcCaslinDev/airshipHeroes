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
   * @param {THREE.TextureLoader} textureLoader - Texture loader for block textures
   */
  loadFromDefinition(shipDefinition, scene, textureLoader) {
    // Clear existing blocks
    this.blocks = [];
    
    // Remove existing meshes from the group
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    
    // Create blocks from the definition
    this.blocks = BlockFactory.createBlocksFromShipDefinition(shipDefinition);
    
    // Create meshes for each block and add to the group
    for (const block of this.blocks) {
      block.createMesh(this.group, textureLoader);
      
      // Store reference to steering wheel
      if (block.type === 'steeringWheel') {
        this.steeringWheel = block;
      }
    }
    
    // Add the group to the scene
    scene.add(this.group);
    
    // Set the ship name if provided
    if (shipDefinition.name) {
      this.name = shipDefinition.name;
    }
    
    // Check if the ship has enough lift
    this.checkLift();
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
      return false;
    }
    
    // Don't allow removing the steering wheel
    if (block.type === 'steeringWheel') {
      console.warn('Cannot remove the steering wheel');
      return false;
    }
    
    // Remove the block
    this.blocks.splice(index, 1);
    
    // Remove the mesh from the group
    if (block.mesh && block.mesh.parent) {
      block.mesh.parent.remove(block.mesh);
    }
    
    // Check if the ship has enough lift
    this.checkLift();
    
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
    
    // Apply vertical movement directly (not affected by rotation)
    if (controls.up) {
      this.velocity.y += 1;
    } else if (controls.down) {
      this.velocity.y -= 1;
    }
    
    // Cap velocities
    const maxSpeed = 5;
    const maxAngularSpeed = Math.PI / 2; // 90 degrees per second
    
    this.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.x));
    this.velocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.y));
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
   * Update the ship's position and rotation
   * @param {Number} deltaTime - Time since last frame in seconds
   * @param {Number} worldHeight - Maximum height of the world
   */
  update(deltaTime, worldHeight = 500) {
    // Update position based on velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
    
    // Update rotation based on angular velocity
    this.rotation += this.angularVelocity * deltaTime;
    
    // Update vertical position
    if (this.isSinking) {
      // Sink at the sink rate
      this.position.y -= this.sinkRate * deltaTime;
    } else {
      // Normal vertical movement
      this.position.y += this.velocity.y * deltaTime;
    }
    
    // Enforce world height limits
    if (this.position.y < 0) {
      this.position.y = 0;
      
      // If the ship hits the ground while sinking, destroy it
      if (this.isSinking) {
        this.destroyOnGroundImpact();
      }
    } else if (this.position.y > worldHeight) {
      this.position.y = worldHeight;
      this.velocity.y = 0;
    }
    
    // Update the group position and rotation
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.rotation;
    
    // Update all blocks
    for (const block of this.blocks) {
      block.update(deltaTime);
    }
    
    // Update steering wheel's ship rotation
    if (this.steeringWheel) {
      this.steeringWheel.shipRotation = this.rotation;
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
    if (!this.steeringWheel) {
      // Fallback if no steering wheel
      return {
        position: {
          x: this.position.x - Math.sin(this.rotation) * distance,
          y: this.position.y + height,
          z: this.position.z - Math.cos(this.rotation) * distance
        },
        target: {
          x: this.position.x,
          y: this.position.y,
          z: this.position.z
        }
      };
    }
    
    // Get camera position from steering wheel
    const position = this.steeringWheel.getCameraPosition(distance, height);
    const target = this.steeringWheel.getCameraTarget();
    
    return { position, target };
  }
}

export default Ship; 