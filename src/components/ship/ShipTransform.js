/**
 * ShipTransform Class
 * 
 * Handles coordinate transformations between ship-local and world space.
 */

import * as THREE from 'three';

class ShipTransform {
  /**
   * Constructor for the ShipTransform class
   * @param {Ship} ship - The ship this transform system belongs to
   */
  constructor(ship) {
    this.ship = ship;
  }

  /**
   * Transform a position from ship-local coordinates to world coordinates
   * @param {Object} localPos - The position in ship-local coordinates {x, y, z}
   * @returns {Object} - The position in world coordinates {x, y, z}
   */
  localToWorldPosition(localPos) {
    // Check if the ship group exists and has a valid matrix
    if (this.ship.group) {
      try {
        // Force update the world matrix
        this.ship.group.updateMatrixWorld(true);
        
        // Create a vector from the local position
        const vector = new THREE.Vector3(localPos.x, localPos.y, localPos.z);
        
        // Apply the ship's world matrix to transform to world space
        vector.applyMatrix4(this.ship.group.matrixWorld);
        
        // Return the transformed position
        return {
          x: vector.x,
          y: vector.y,
          z: vector.z
        };
      } catch (error) {
        console.error('Error in localToWorldPosition using matrix:', error);
        // Fall back to manual calculation
      }
    }
    
    // Manual calculation as fallback
    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);
    
    return {
      x: this.ship.position.x + (localPos.x * cos - localPos.z * sin),
      y: this.ship.position.y + localPos.y,
      z: this.ship.position.z + (localPos.x * sin + localPos.z * cos)
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
      x: worldPos.x - this.ship.position.x,
      y: worldPos.y - this.ship.position.y,
      z: worldPos.z - this.ship.position.z
    };
    
    // Rotate around Y axis (inverse of ship rotation)
    const sin = Math.sin(-this.ship.rotation);
    const cos = Math.cos(-this.ship.rotation);
    
    return {
      x: translatedPos.x * cos - translatedPos.z * sin,
      y: translatedPos.y,
      z: translatedPos.x * sin + translatedPos.z * cos
    };
  }

  /**
   * Transform a direction vector from ship-local coordinates to world coordinates
   * @param {Object} localDir - The direction in ship-local coordinates {x, y, z}
   * @returns {Object} - The direction in world coordinates {x, y, z}
   */
  localToWorldDirection(localDir) {
    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);
    
    return {
      x: localDir.x * cos - localDir.z * sin,
      y: localDir.y,
      z: localDir.x * sin + localDir.z * cos
    };
  }

  /**
   * Transform a direction vector from world coordinates to ship-local coordinates
   * @param {Object} worldDir - The direction in world coordinates {x, y, z}
   * @returns {Object} - The direction in ship-local coordinates {x, y, z}
   */
  worldToLocalDirection(worldDir) {
    const sin = Math.sin(-this.ship.rotation);
    const cos = Math.cos(-this.ship.rotation);
    
    return {
      x: worldDir.x * cos - worldDir.z * sin,
      y: worldDir.y,
      z: worldDir.x * sin + worldDir.z * cos
    };
  }

  /**
   * Get the forward direction vector of the ship in world space
   * @returns {Object} - The forward direction vector {x, y, z}
   */
  getForwardDirection() {
    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);
    
    return {
      x: sin,
      y: 0,
      z: cos
    };
  }

  /**
   * Get the right direction vector of the ship in world space
   * @returns {Object} - The right direction vector {x, y, z}
   */
  getRightDirection() {
    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);
    
    return {
      x: cos,
      y: 0,
      z: -sin
    };
  }

  /**
   * Get the up direction vector of the ship in world space
   * @returns {Object} - The up direction vector {x, y, z}
   */
  getUpDirection() {
    return {
      x: 0,
      y: 1,
      z: 0
    };
  }
}

export default ShipTransform; 