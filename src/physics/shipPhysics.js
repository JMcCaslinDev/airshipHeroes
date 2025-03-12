/**
 * Ship physics module for handling ship movement and physics
 */

import * as THREE from 'three';
import { clamp } from '../utils/mathUtils.js';

// Constants
const GRAVITY = 9.8;
const DRAG = 0.5;
const THRUST = 60;
const ROTATION_SPEED = 2.5;
const LIFT_BLOCK_RATIO = 0.3; // Minimum ratio of lift blocks to total blocks

/**
 * Update ship physics
 * @param {Object} ship - The ship to update
 * @param {Object} worldManager - The world manager
 * @param {number} deltaTime - The time since the last update in seconds
 */
export function updateShipPhysics(ship, worldManager, deltaTime) {
  // Skip if no ship
  if (!ship) return;
  
  // Calculate lift ratio
  const totalBlocks = ship.blocks.length;
  if (totalBlocks === 0) return;
  
  const liftBlocks = ship.blocks.filter(block => block.type === 'lift').length;
  const liftRatio = liftBlocks / totalBlocks;
  
  // Ships are neutrally buoyant by default
  // Only apply sinking if the ship is damaged (less than 30% lift blocks)
  if (liftRatio < LIFT_BLOCK_RATIO) {
    // Start sinking
    if (!ship.isSinking) {
      ship.isSinking = true;
    }
  } else {
    // Stop sinking
    if (ship.isSinking) {
      ship.isSinking = false;
    }
  }
  
  // Apply thrust based on controls
  if (ship.controls) {
    const thrustForce = {
      x: 0,
      y: 0,
      z: 0
    };
    
    if (ship.controls.forward) {
      thrustForce.z += THRUST * deltaTime;
    }
    
    if (ship.controls.backward) {
      thrustForce.z -= THRUST * deltaTime;
    }
    
    // Apply vertical thrust
    if (ship.controls.up) {
      thrustForce.y += THRUST * deltaTime;
    }
    
    if (ship.controls.down) {
      thrustForce.y -= THRUST * deltaTime;
    }
    
    // Apply thrust in the direction the ship is facing
    if (thrustForce.z !== 0 || thrustForce.y !== 0) {
      const rotatedForce = rotateForce(thrustForce, ship.rotation);
      applyForce(ship, rotatedForce);
    }
    
    // Apply rotation
    if (ship.controls.left) {
      applyTorque(ship, ROTATION_SPEED * deltaTime);
    }
    
    if (ship.controls.right) {
      applyTorque(ship, -ROTATION_SPEED * deltaTime);
    }
  }
  
  // Apply drag
  const dragForce = {
    x: -ship.velocity.x * DRAG * deltaTime,
    y: -ship.velocity.y * DRAG * 0.1 * deltaTime, // Less drag in vertical direction
    z: -ship.velocity.z * DRAG * deltaTime
  };
  
  applyForce(ship, dragForce);
  
  // Update position and rotation
  updatePosition(ship, deltaTime);
  updateRotation(ship, deltaTime);
  
  // Check for collisions
  checkCollisions(ship, worldManager);
}

/**
 * Apply a force to a ship
 * @param {Object} ship - The ship to apply the force to
 * @param {Object} force - The force to apply {x, y, z}
 */
export function applyForce(ship, force) {
  ship.velocity.x += force.x;
  ship.velocity.y += force.y;
  ship.velocity.z += force.z;
}

/**
 * Apply a torque to a ship
 * @param {Object} ship - The ship to apply the torque to
 * @param {number} torque - The torque to apply
 */
export function applyTorque(ship, torque) {
  ship.angularVelocity += torque;
}

/**
 * Update a ship's position based on its velocity
 * @param {Object} ship - The ship to update
 * @param {number} deltaTime - The time since the last update in seconds
 */
export function updatePosition(ship, deltaTime) {
  // Update position based on velocity
  ship.position.x += ship.velocity.x * deltaTime;
  ship.position.y += ship.velocity.y * deltaTime;
  ship.position.z += ship.velocity.z * deltaTime;
  
  // Update group position
  if (ship.group) {
    ship.group.position.set(ship.position.x, ship.position.y, ship.position.z);
  }
}

/**
 * Update a ship's rotation based on its angular velocity
 * @param {Object} ship - The ship to update
 * @param {number} deltaTime - The time since the last update in seconds
 */
export function updateRotation(ship, deltaTime) {
  // Update rotation based on angular velocity
  ship.rotation += ship.angularVelocity * deltaTime;
  
  // Normalize rotation to [0, 2π)
  ship.rotation = ship.rotation % (Math.PI * 2);
  if (ship.rotation < 0) {
    ship.rotation += Math.PI * 2;
  }
  
  // Update group rotation
  if (ship.group) {
    ship.group.rotation.y = ship.rotation;
  }
}

/**
 * Check for collisions between a ship and the world
 * @param {Object} ship - The ship to check
 * @param {Object} worldManager - The world manager to check against
 * @returns {boolean} Whether a collision occurred
 */
export function checkCollisions(ship, worldManager) {
  // Simple collision check with the ground
  const lowestBlock = ship.blocks.reduce((lowest, block) => {
    const worldY = ship.position.y + block.position.y;
    return worldY < lowest ? worldY : lowest;
  }, Infinity);
  
  // Check if the lowest block is below the ground
  if (lowestBlock < 1) {
    // Move the ship up so it's not colliding
    ship.position.y -= lowestBlock;
    
    // Update group position
    if (ship.group) {
      ship.group.position.y = ship.position.y;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Rotate a force vector based on ship rotation
 * @param {Object} force - The force vector {x, y, z}
 * @param {number} rotation - The rotation angle in radians
 * @returns {Object} The rotated force vector
 */
function rotateForce(force, rotation) {
  const vector = new THREE.Vector3(force.x, force.y, force.z);
  vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
  
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
} 