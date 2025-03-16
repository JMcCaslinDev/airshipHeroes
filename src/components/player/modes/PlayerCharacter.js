/**
 * PlayerCharacter Class
 * 
 * Manages the player character in Player Mode, including:
 * - Character mesh and appearance
 * - Character physics and movement
 * - Collision detection
 */

import * as THREE from 'three';

class PlayerCharacter {
  /**
   * Constructor for the PlayerCharacter class
   */
  constructor() {
    this.height = 2; // 2 blocks tall
    this.width = 0.6; // 0.6 blocks wide
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = 0;
    this.isSneaking = false;
    this.isJumping = false;
    this.mesh = null;
  }

  /**
   * Create the player character mesh
   * @param {THREE.Scene} scene - The Three.js scene
   */
  createMesh(scene) {
    try {
      // Check if scene is provided
      if (!scene) {
        console.error('Scene is undefined in createMesh');
        return;
      }
      
      // Create a simple capsule for the player character
      const geometry = new THREE.CapsuleGeometry(0.3, 1.4, 4, 8);
      const material = new THREE.MeshStandardMaterial({ color: 0x0000ff }); // Blue
      
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.castShadow = true;
      
      // Position at the initial position
      this.updateMeshPosition();
      
      // Add to scene
      scene.add(this.mesh);
      
      // Hide initially (start in Ship Mode)
      this.mesh.visible = false;
      
      console.log('Character mesh created successfully');
    } catch (error) {
      console.error('Error creating character mesh:', error);
    }
  }

  /**
   * Update the mesh position to match the character position
   */
  updateMeshPosition() {
    if (this.mesh) {
      this.mesh.position.set(
        this.position.x,
        this.position.y,
        this.position.z
      );
    }
  }

  /**
   * Set the visibility of the character mesh
   * @param {Boolean} visible - Whether the mesh should be visible
   */
  setVisible(visible) {
    if (this.mesh) {
      this.mesh.visible = visible;
    }
  }

  /**
   * Update the character position and physics
   * @param {Number} deltaTime - Time since last frame in seconds
   * @param {Object} controls - The control state
   * @param {Object} ship - The ship instance
   */
  update(deltaTime, controls, ship) {
    // Apply gravity
    this.velocity.y -= 9.8 * deltaTime;
    
    // Apply movement based on controls
    const moveSpeed = this.isSneaking ? 1 : 2;
    
    // Create direction vectors based on character orientation
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    // Apply character rotation to these vectors
    forward.applyEuler(new THREE.Euler(0, this.rotation, 0, 'YXZ'));
    right.applyEuler(new THREE.Euler(0, this.rotation, 0, 'YXZ'));
    
    // Calculate final movement direction
    const finalDirection = new THREE.Vector3(0, 0, 0);
    
    if (controls.forward) finalDirection.add(forward);
    if (controls.backward) finalDirection.sub(forward);
    if (controls.right) finalDirection.add(right);
    if (controls.left) finalDirection.sub(right);
    
    // Apply movement
    if (finalDirection.length() > 0) {
      finalDirection.normalize().multiplyScalar(moveSpeed * deltaTime);
      
      // Apply movement to velocity
      this.velocity.x = finalDirection.x;
      this.velocity.z = finalDirection.z;
    } else {
      // Stop horizontal movement
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
    
    // Apply jumping
    if (controls.jump && !this.isJumping) {
      this.velocity.y = 2.5;
      this.isJumping = true;
    }
    
    // Apply sneaking
    this.isSneaking = controls.sneak;
    
    // Store current position before movement
    const previousPosition = { ...this.position };
    
    // Update position
    const newPosition = {
      x: previousPosition.x + this.velocity.x,
      y: previousPosition.y + this.velocity.y * deltaTime,
      z: previousPosition.z + this.velocity.z
    };
    
    // Handle collisions and adjust position
    this.handleCollisions(previousPosition, newPosition, ship);
    
    // Check if character is on ground
    const groundY = 0;
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isJumping = false;
    }
    
    // Keep character on the ship
    if (ship) {
      this.keepOnShip(ship);
      
      // Move with the ship
      this.position.x += ship.velocity.x * deltaTime;
      this.position.y += ship.velocity.y * deltaTime;
      this.position.z += ship.velocity.z * deltaTime;
    }
    
    // Update character mesh position
    this.updateMeshPosition();
  }

  /**
   * Handle collisions with ship blocks
   * @param {Object} previousPosition - The position before movement
   * @param {Object} newPosition - The proposed new position
   * @param {Object} ship - The ship instance
   */
  handleCollisions(previousPosition, newPosition, ship) {
    if (!ship || ship.blocks.length === 0) {
      // No ship or blocks to collide with
      this.position = newPosition;
      return;
    }
    
    // Create a simple collision box for the character
    const characterBox = new THREE.Box3();
    const characterSize = { 
      width: this.width, 
      height: this.height, 
      depth: this.width 
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
    
    for (const block of ship.blocks) {
      // Skip blocks without meshes
      if (!block.mesh) continue;
      
      // Get the collision box for this block
      const blockBox = block.getCollisionBox(ship);
      
      // Check for intersection
      if (characterBox.intersectsBox(blockBox)) {
        collisionDetected = true;
        break;
      }
    }
    
    // If collision detected, try to slide along walls
    if (collisionDetected) {
      this.handleSliding(previousPosition, newPosition, ship);
    } else {
      // No collision, apply the new position
      this.position = newPosition;
    }
  }

  /**
   * Handle sliding along walls when collisions occur
   * @param {Object} previousPosition - The position before movement
   * @param {Object} newPosition - The proposed new position
   * @param {Object} ship - The ship instance
   */
  handleSliding(previousPosition, newPosition, ship) {
    // Try X movement only
    const xOnlyPosition = {
      x: previousPosition.x + this.velocity.x,
      y: previousPosition.y,
      z: previousPosition.z
    };
    
    // Check X-only movement
    const xCollision = this.checkCollision(xOnlyPosition, ship);
    
    // Try Z movement only
    const zOnlyPosition = {
      x: previousPosition.x,
      y: previousPosition.y,
      z: previousPosition.z + this.velocity.z
    };
    
    // Check Z-only movement
    const zCollision = this.checkCollision(zOnlyPosition, ship);
    
    // Apply the valid movement
    if (!xCollision) {
      this.position.x = xOnlyPosition.x;
      this.position.z = previousPosition.z;
    } else if (!zCollision) {
      this.position.x = previousPosition.x;
      this.position.z = zOnlyPosition.z;
    } else {
      // Both directions have collisions, don't move horizontally
      this.position.x = previousPosition.x;
      this.position.z = previousPosition.z;
    }
    
    // Handle vertical movement separately
    this.handleVerticalCollision(previousPosition, newPosition, ship);
  }

  /**
   * Check if a position would cause a collision
   * @param {Object} position - The position to check
   * @param {Object} ship - The ship instance
   * @returns {Boolean} - Whether a collision would occur
   */
  checkCollision(position, ship) {
    const characterBox = new THREE.Box3();
    const characterSize = { 
      width: this.width, 
      height: this.height, 
      depth: this.width 
    };
    
    // Set up character box at the position
    characterBox.min.set(
      position.x - characterSize.width / 2,
      position.y,
      position.z - characterSize.width / 2
    );
    
    characterBox.max.set(
      position.x + characterSize.width / 2,
      position.y + characterSize.height,
      position.z + characterSize.width / 2
    );
    
    // Check for collisions with blocks
    for (const block of ship.blocks) {
      if (!block.mesh) continue;
      
      const blockBox = block.getCollisionBox(ship);
      
      if (characterBox.intersectsBox(blockBox)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Handle vertical collisions
   * @param {Object} previousPosition - The position before movement
   * @param {Object} newPosition - The proposed new position
   * @param {Object} ship - The ship instance
   */
  handleVerticalCollision(previousPosition, newPosition, ship) {
    // Check if we're standing on a block
    const isStandingOnBlock = this.checkIfStandingOnBlock(ship);
    
    if (isStandingOnBlock.standing) {
      // If the player is standing on a block, place them on top of it
      this.position.y = isStandingOnBlock.blockTop;
      this.velocity.y = 0;
      this.isJumping = false;
    } else {
      // Check for vertical collisions
      const verticalCheckPosition = {
        x: this.position.x,
        y: previousPosition.y + this.velocity.y * 0.016, // Assuming 60fps
        z: this.position.z
      };
      
      const verticalCollision = this.checkCollision(verticalCheckPosition, ship);
      
      if (verticalCollision) {
        // If moving down, find the highest block to stand on
        if (this.velocity.y <= 0) {
          const highestBlock = this.findHighestBlockBelow(ship);
          
          if (highestBlock) {
            this.position.y = highestBlock;
            this.velocity.y = 0;
            this.isJumping = false;
          } else {
            // No block below, keep falling
            this.position.y = verticalCheckPosition.y;
          }
        } else {
          // If moving up and hitting a ceiling, stop upward movement
          this.velocity.y = 0;
          this.position.y = previousPosition.y;
        }
      } else {
        // No vertical collision, apply normal vertical movement
        this.position.y = verticalCheckPosition.y;
      }
    }
  }

  /**
   * Check if the character is standing on a block
   * @param {Object} ship - The ship instance
   * @returns {Object} - Object with standing status and block top position
   */
  checkIfStandingOnBlock(ship) {
    // Create a ray starting from the player's feet and going down
    const rayStart = new THREE.Vector3(
      this.position.x,
      this.position.y + 0.1, // Slightly above the player's feet
      this.position.z
    );
    
    const rayDirection = new THREE.Vector3(0, -1, 0); // Straight down
    const raycaster = new THREE.Raycaster(rayStart, rayDirection, 0, 0.2); // Short ray
    
    // Check for intersection with blocks
    let highestBlockY = -Infinity;
    let isStanding = false;
    
    for (const block of ship.blocks) {
      if (!block.mesh) continue;
      
      const blockBox = block.getCollisionBox(ship);
      
      // Create a box for the raycaster to intersect with
      const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
      const blockMesh = new THREE.Mesh(blockGeometry);
      blockMesh.position.set(
        (blockBox.min.x + blockBox.max.x) / 2,
        (blockBox.min.y + blockBox.max.y) / 2,
        (blockBox.min.z + blockBox.max.z) / 2
      );
      
      // Scale the mesh to match the block box
      blockMesh.scale.set(
        blockBox.max.x - blockBox.min.x,
        blockBox.max.y - blockBox.min.y,
        blockBox.max.z - blockBox.min.z
      );
      
      // Check for intersection
      const intersects = raycaster.intersectObject(blockMesh);
      if (intersects.length > 0) {
        isStanding = true;
        if (blockBox.max.y > highestBlockY) {
          highestBlockY = blockBox.max.y;
        }
      }
      
      // Clean up temporary mesh
      blockGeometry.dispose();
    }
    
    return {
      standing: isStanding,
      blockTop: highestBlockY
    };
  }

  /**
   * Find the highest block below the character
   * @param {Object} ship - The ship instance
   * @returns {Number|null} - The Y position of the highest block, or null if none found
   */
  findHighestBlockBelow(ship) {
    let highestBlockY = -Infinity;
    let foundBlock = false;
    
    for (const block of ship.blocks) {
      if (!block.mesh) continue;
      
      const blockBox = block.getCollisionBox(ship);
      
      // Check if the block is below the character
      if (blockBox.max.y <= this.position.y && 
          this.position.x >= blockBox.min.x && this.position.x <= blockBox.max.x &&
          this.position.z >= blockBox.min.z && this.position.z <= blockBox.max.z) {
        
        foundBlock = true;
        if (blockBox.max.y > highestBlockY) {
          highestBlockY = blockBox.max.y;
        }
      }
    }
    
    return foundBlock ? highestBlockY : null;
  }

  /**
   * Keep the character on the ship
   * @param {Object} ship - The ship instance
   */
  keepOnShip(ship) {
    // Check if character is too far from steering wheel
    const steeringWheelPos = ship.steeringWheel ? 
      ship.getBlockWorldPosition(ship.steeringWheel) : 
      ship.position;
    
    const distanceFromWheel = Math.sqrt(
      Math.pow(this.position.x - steeringWheelPos.x, 2) +
      Math.pow(this.position.z - steeringWheelPos.z, 2)
    );
    
    if (distanceFromWheel > 25) {
      // Teleport back to steering wheel
      this.position = { ...steeringWheelPos };
      this.position.y += 1; // Stand on top of the steering wheel
      this.velocity = { x: 0, y: 0, z: 0 };
      this.isJumping = false;
    }
  }
}

export default PlayerCharacter; 