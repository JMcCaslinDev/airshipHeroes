/**
 * ShipPhysics Class
 * 
 * Handles physics calculations for a ship, including movement, rotation, and gravity.
 */

class ShipPhysics {
  /**
   * Constructor for the ShipPhysics class
   * @param {Ship} ship - The ship this physics system belongs to
   */
  constructor(ship) {
    this.ship = ship;
  }

  /**
   * Apply thrust from all engine blocks
   * @param {Object} controls - Control inputs {forward, backward, left, right, up, down}
   */
  applyThrust(controls) {
    // Reset velocity
    this.ship.velocity = { x: 0, y: 0, z: 0 };
    this.ship.angularVelocity = 0;
    
    // Find all engine blocks
    const engineBlocks = this.ship.blockManager.blocks.filter(block => block.type === 'engine');
    
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
        this.ship.velocity.x += rotatedThrust.x;
        this.ship.velocity.z += rotatedThrust.z;
        
        // Apply turning force if side engines
        if (engine.direction.x !== 0) {
          this.ship.angularVelocity += engine.direction.x * 0.02; // Adjust turning speed
        }
      }
    }
    
    // Store controls for use in update method
    this.ship.controls = controls;
    
    // Cap velocities
    const maxSpeed = 5;
    const maxAngularSpeed = Math.PI / 2; // 90 degrees per second
    
    this.ship.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, this.ship.velocity.x));
    this.ship.velocity.z = Math.max(-maxSpeed, Math.min(maxSpeed, this.ship.velocity.z));
    this.ship.angularVelocity = Math.max(-maxAngularSpeed, Math.min(maxAngularSpeed, this.ship.angularVelocity));
  }

  /**
   * Rotate a vector by the ship's rotation
   * @param {Object} vector - The vector to rotate {x, y, z}
   * @returns {Object} - The rotated vector {x, y, z}
   */
  rotateVector(vector) {
    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);
    
    return {
      x: vector.x * cos - vector.z * sin,
      y: vector.y,
      z: vector.x * sin + vector.z * cos
    };
  }

  /**
   * Update the ship's physics
   * @param {number} deltaTime - The time since the last update in seconds
   * @param {number} worldHeight - The maximum height of the world
   */
  update(deltaTime, worldHeight = 500) {
    // Apply physics
    this.ship.position.x += this.ship.velocity.x * deltaTime;
    this.ship.position.y += this.ship.velocity.y * deltaTime;
    this.ship.position.z += this.ship.velocity.z * deltaTime;
    
    // Apply angular velocity
    this.ship.rotation += this.ship.angularVelocity * deltaTime;
    
    // Apply drag
    const drag = 0.95;
    this.ship.velocity.x *= drag;
    this.ship.velocity.z *= drag;
    this.ship.angularVelocity *= drag;
    
    // Apply bobbing motion when not moving AND not actively changing altitude
    const isMoving = Math.abs(this.ship.velocity.x) > 0.1 || Math.abs(this.ship.velocity.z) > 0.1;
    const isChangingAltitude = this.ship.controls && (this.ship.controls.up || this.ship.controls.down);
    
    if (!isMoving && !isChangingAltitude && !this.ship.isSinking) {
      // Store the base Y position if we don't have one yet
      if (!this.ship.baseY) {
        this.ship.baseY = this.ship.position.y;
      }
      
      // Calculate bobbing based on time
      const time = performance.now() / 1000; // Current time in seconds
      // Faster, subtle bobbing for airship/balloon-like motion
      const bobOffset = Math.sin(time * 0.7) * 0.5; // Faster, subtle bobbing effect with 0.5 block amplitude
      
      // Set position directly based on base position plus offset
      this.ship.position.y = this.ship.baseY + bobOffset;
      
      // Reset velocity since we're directly setting position
      this.ship.velocity.y = 0;
    } else {
      // Reset baseY when moving so it can be recalculated when stopped
      this.ship.baseY = null;
    }
    
    // Apply gravity if sinking
    if (this.ship.isSinking) {
      this.ship.velocity.y -= this.ship.sinkRate * deltaTime;
    }
    
    // Enforce world boundaries
    this.enforceWorldBoundaries(worldHeight);
    
    // Update group position and rotation
    if (this.ship.group) {
      // Log before update
      console.log(`Before update - Ship position: ${JSON.stringify(this.ship.position)}`);
      console.log(`Before update - Group position: ${JSON.stringify({
        x: this.ship.group.position.x,
        y: this.ship.group.position.y,
        z: this.ship.group.position.z
      })}`);
      
      // Update position and rotation
      this.ship.group.position.set(this.ship.position.x, this.ship.position.y, this.ship.position.z);
      this.ship.group.rotation.y = this.ship.rotation;
      
      // Ensure the group is visible
      this.ship.group.visible = true;
      
      // Force update the world matrix of the group and all its children
      this.ship.group.updateMatrixWorld(true);
      
      // Log after update
      console.log(`After update - Ship position: ${JSON.stringify(this.ship.position)}`);
      console.log(`After update - Group position: ${JSON.stringify({
        x: this.ship.group.position.x,
        y: this.ship.group.position.y,
        z: this.ship.group.position.z
      })}`);
      
      // Log position periodically
      if (Math.random() < 0.01) {
        console.log(`Ship position: ${JSON.stringify(this.ship.position)}`);
        console.log(`Ship group position: ${JSON.stringify({
          x: this.ship.group.position.x,
          y: this.ship.group.position.y,
          z: this.ship.group.position.z
        })}`);
        
        // Log controls
        console.log(`Ship controls: ${JSON.stringify(this.ship.controls)}`);
        
        // Log velocity
        console.log(`Ship velocity: ${JSON.stringify(this.ship.velocity)}`);
      }
    }
  }

  /**
   * Enforce world boundaries for the ship
   * @param {number} worldHeight - The maximum height of the world
   */
  enforceWorldBoundaries(worldHeight) {
    // Enforce world radius
    const worldRadius = 500;
    const distance = Math.sqrt(this.ship.position.x * this.ship.position.x + this.ship.position.z * this.ship.position.z);
    
    if (distance > worldRadius) {
      const angle = Math.atan2(this.ship.position.z, this.ship.position.x);
      this.ship.position.x = Math.cos(angle) * worldRadius;
      this.ship.position.z = Math.sin(angle) * worldRadius;
      
      // Bounce back
      this.ship.velocity.x *= -0.5;
      this.ship.velocity.z *= -0.5;
    }
    
    // Enforce world height
    if (this.ship.position.y > worldHeight) {
      this.ship.position.y = worldHeight;
      this.ship.velocity.y = 0;
    }
    
    // Check for ground impact
    if (this.ship.position.y < 0) {
      this.ship.position.y = 0;
      this.ship.velocity.y = 0;
      
      // Destroy ship on impact if moving fast enough
      if (this.ship.velocity.y < -10) {
        this.destroyOnGroundImpact();
      }
    }
  }

  /**
   * Destroy the ship when it hits the ground while sinking
   */
  destroyOnGroundImpact() {
    console.log(`Ship "${this.ship.name}" has crashed into the ground!`);
    
    // In a full implementation, this would trigger explosion effects
    // and respawn the player with a new ship
    
    // For now, just log the event
    if (this.ship.owner) {
      this.ship.owner.deaths++;
      console.log(`${this.ship.owner.username} has died. Deaths: ${this.ship.owner.deaths}`);
    }
  }
}

export default ShipPhysics; 