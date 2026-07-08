/**
 * ShipWeapons Class
 * 
 * Handles weapons systems for a ship, including cannons and projectiles.
 */

class ShipWeapons {
  /**
   * Constructor for the ShipWeapons class
   * @param {Ship} ship - The ship this weapons system belongs to
   */
  constructor(ship) {
    this.ship = ship;
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
    const cannonBlocks = this.ship.blockManager.blocks.filter(block => block.type === 'cannon');
    
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
        const projectile = this.fireCannon(cannon, scene);
        
        if (projectile) {
          projectiles.push(projectile);
        }
      }
    }
    
    return projectiles;
  }

  /**
   * Fire a specific cannon
   * @param {Object} cannon - The cannon block to fire
   * @param {THREE.Scene} scene - The scene to add the projectile to
   * @returns {Object|null} - The projectile fired, or null if firing failed
   */
  fireCannon(cannon, scene) {
    // Check if the cannon is ready to fire
    if (cannon.cooldown > 0) {
      console.log(`Cannon at position ${JSON.stringify(cannon.position)} is on cooldown`);
      return null;
    }
    
    // Get the cannon's world position
    const cannonWorldPos = this.ship.blockManager.getBlockWorldPosition(cannon);
    
    // Get the cannon's firing direction in world space
    const localDirection = { ...cannon.direction };
    const worldDirection = this.ship.transform.localToWorldDirection(localDirection);
    
    // Create the projectile
    const projectile = cannon.fire(scene, this.ship.velocity);
    
    // If firing was successful, register tracked projectile when handler is set
    if (projectile) {
      if (this.ship.registerCannonShot) {
        return this.ship.registerCannonShot(projectile, scene);
      }

      if (projectile.userData?.velocity) {
        projectile.userData.velocity.x += this.ship.velocity.x;
        projectile.userData.velocity.z += this.ship.velocity.z;
      }

      if (this.ship.owner) {
        projectile.owner = this.ship.owner;
      }

      return projectile;
    }
    
    return null;
  }

  /**
   * Check if any cannons are ready to fire in a specific direction
   * @param {String} direction - The direction to check ('forward', 'backward', 'left', 'right')
   * @returns {Boolean} - Whether any cannons are ready to fire in the specified direction
   */
  canFireInDirection(direction) {
    // Find all cannon blocks
    const cannonBlocks = this.ship.blockManager.blocks.filter(block => block.type === 'cannon');
    
    // Check if any cannons are facing the requested direction and ready to fire
    for (const cannon of cannonBlocks) {
      // Check if this cannon is facing the requested direction
      let isFacingDirection = false;
      
      if (direction === 'forward' && cannon.direction.z === -1) {
        isFacingDirection = true;
      } else if (direction === 'backward' && cannon.direction.z === 1) {
        isFacingDirection = true;
      } else if (direction === 'left' && cannon.direction.x === -1) {
        isFacingDirection = true;
      } else if (direction === 'right' && cannon.direction.x === 1) {
        isFacingDirection = true;
      }
      
      // If the cannon is facing the right direction and ready to fire, return true
      if (isFacingDirection && cannon.cooldown <= 0) {
        return true;
      }
    }
    
    // No cannons are ready to fire in the specified direction
    return false;
  }

  /**
   * Get the number of cannons facing a specific direction
   * @param {String} direction - The direction to check ('forward', 'backward', 'left', 'right')
   * @returns {Number} - The number of cannons facing the specified direction
   */
  getCannonCountInDirection(direction) {
    // Find all cannon blocks
    const cannonBlocks = this.ship.blockManager.blocks.filter(block => block.type === 'cannon');
    
    // Count cannons facing the requested direction
    let count = 0;
    
    for (const cannon of cannonBlocks) {
      // Check if this cannon is facing the requested direction
      if (direction === 'forward' && cannon.direction.z === -1) {
        count++;
      } else if (direction === 'backward' && cannon.direction.z === 1) {
        count++;
      } else if (direction === 'left' && cannon.direction.x === -1) {
        count++;
      } else if (direction === 'right' && cannon.direction.x === 1) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Update all weapons (e.g., reduce cooldowns)
   * @param {Number} deltaTime - The time since the last update in seconds
   */
  update(deltaTime) {
    // Find all cannon blocks
    const cannonBlocks = this.ship.blockManager.blocks.filter(block => block.type === 'cannon');
    
    // Update each cannon
    for (const cannon of cannonBlocks) {
      // Reduce cooldown
      if (cannon.cooldown > 0) {
        cannon.cooldown -= deltaTime;
        
        // Ensure cooldown doesn't go below 0
        if (cannon.cooldown < 0) {
          cannon.cooldown = 0;
        }
      }
    }
  }
}

export default ShipWeapons; 