/**
 * Physics Engine Module
 * 
 * Handles physics calculations for the game.
 */

import * as CollisionDetector from './collisionDetector.js';

// Physics constants
const GRAVITY = 9.8; // m/s²
const AIR_RESISTANCE = 0.01;
const TERMINAL_VELOCITY = 50;

/**
 * Apply gravity to an object
 * @param {Object} object - The object to apply gravity to
 * @param {Number} deltaTime - Time since last frame in seconds
 */
export function applyGravity(object, deltaTime) {
  if (!object.velocity) {
    object.velocity = { x: 0, y: 0, z: 0 };
  }
  
  // Apply gravity
  object.velocity.y -= GRAVITY * deltaTime;
  
  // Cap at terminal velocity
  if (object.velocity.y < -TERMINAL_VELOCITY) {
    object.velocity.y = -TERMINAL_VELOCITY;
  }
}

/**
 * Apply air resistance to an object
 * @param {Object} object - The object to apply air resistance to
 * @param {Number} deltaTime - Time since last frame in seconds
 */
export function applyAirResistance(object, deltaTime) {
  if (!object.velocity) return;
  
  // Apply air resistance
  object.velocity.x *= (1 - AIR_RESISTANCE * deltaTime);
  object.velocity.y *= (1 - AIR_RESISTANCE * deltaTime);
  object.velocity.z *= (1 - AIR_RESISTANCE * deltaTime);
}

/**
 * Update an object's position based on its velocity
 * @param {Object} object - The object to update
 * @param {Number} deltaTime - Time since last frame in seconds
 */
export function updatePosition(object, deltaTime) {
  if (!object.velocity || !object.position) return;
  
  // Update position
  object.position.x += object.velocity.x * deltaTime;
  object.position.y += object.velocity.y * deltaTime;
  object.position.z += object.velocity.z * deltaTime;
}

/**
 * Check if an object is on the ground
 * @param {Object} object - The object to check
 * @param {Number} groundY - The Y coordinate of the ground
 * @returns {Boolean} - Whether the object is on the ground
 */
export function isOnGround(object, groundY) {
  if (!object.position) return false;
  
  // Check if the object is on the ground
  return object.position.y <= groundY;
}

/**
 * Handle collision with the ground
 * @param {Object} object - The object to handle collision for
 * @param {Number} groundY - The Y coordinate of the ground
 * @param {Number} bounceFactor - How much the object bounces (0-1)
 */
export function handleGroundCollision(object, groundY, bounceFactor = 0) {
  if (!object.position || !object.velocity) return;
  
  // Check if the object is below the ground
  if (object.position.y < groundY) {
    // Place the object on the ground
    object.position.y = groundY;
    
    // Bounce if the object is moving downward
    if (object.velocity.y < 0) {
      // Apply bounce
      object.velocity.y = -object.velocity.y * bounceFactor;
      
      // If the bounce is very small, stop the object
      if (Math.abs(object.velocity.y) < 0.1) {
        object.velocity.y = 0;
      }
    }
  }
}

/**
 * Handle collision between an object and blocks
 * @param {Object} object - The object to handle collision for
 * @param {Array} blocks - Array of blocks to check collision with
 * @param {Number} objectRadius - Radius of the object for collision
 */
export function handleBlockCollisions(object, blocks, objectRadius) {
  if (!object.position || !object.velocity) return;
  
  // Create a sphere for the object
  const sphereCenter = object.position;
  
  // Check collision with each block
  for (const block of blocks) {
    if (!block.position || block.isDestroyed) continue;
    
    // Generate AABB for the block
    const blockAABB = CollisionDetector.generateBlockAABB(block.position);
    
    // Check if the sphere intersects with the block
    if (CollisionDetector.sphereBoxIntersection(sphereCenter, objectRadius, blockAABB)) {
      // Handle collision response here
      // For example, damage the block
      if (block.takeDamage) {
        block.takeDamage(1);
      }
      
      // For projectiles, you might want to destroy them on collision
      if (object.destroy) {
        object.destroy();
      }
      
      return true; // Collision occurred
    }
  }
  
  return false; // No collision
}

/**
 * Apply projectile physics
 * @param {Object} projectile - The projectile to update
 * @param {Number} deltaTime - Time since last frame in seconds
 */
export function updateProjectile(projectile, deltaTime) {
  if (!projectile || projectile.isDestroyed) return;
  
  // Apply gravity
  applyGravity(projectile, deltaTime);
  
  // Apply air resistance
  applyAirResistance(projectile, deltaTime);
  
  // Update position
  updatePosition(projectile, deltaTime);
  
  // Update fuse timer if it exists
  if (projectile.fuseTimer !== undefined) {
    projectile.fuseTimer -= deltaTime;
    
    // Explode if the fuse timer reaches zero
    if (projectile.fuseTimer <= 0 && projectile.explode) {
      projectile.explode();
    }
  }
} 