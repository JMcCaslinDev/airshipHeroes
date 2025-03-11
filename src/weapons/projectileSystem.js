/**
 * Projectile System
 * 
 * Manages the creation, updating, and destruction of projectiles in the game.
 */

import * as THREE from 'three';
import Projectile from './projectile.js';

/**
 * Creates a projectile system
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} world - The world manager
 * @param {Object} explosionSystem - The explosion system
 * @returns {Object} - The projectile system
 */
export function createProjectileSystem(scene, world, explosionSystem) {
  // Array to store active projectiles
  const projectiles = [];
  
  // Projectile types and their properties
  const projectileTypes = {
    cannonball: {
      radius: 0.25,
      damage: 2,
      timeToLive: 10,
      createMesh: () => {
        const geometry = typeof THREE.SphereGeometry === 'function' 
          ? new THREE.SphereGeometry(0.25, 8, 8) 
          : { type: 'sphere' };
        const material = typeof THREE.MeshBasicMaterial === 'function'
          ? new THREE.MeshBasicMaterial({ color: 0x333333 })
          : { color: 0x333333 };
        return { geometry, material };
      }
    },
    tnt: {
      radius: 0.5,
      damage: 5,
      timeToLive: 20,
      fuse: 3, // 3 seconds before detonation
      createMesh: () => {
        const geometry = typeof THREE.BoxGeometry === 'function'
          ? new THREE.BoxGeometry(0.5, 0.5, 0.5)
          : { type: 'box' };
        const material = typeof THREE.MeshBasicMaterial === 'function'
          ? new THREE.MeshBasicMaterial({ color: 0xff0000 })
          : { color: 0xff0000 };
        return { geometry, material };
      }
    }
  };
  
  /**
   * Create a new projectile
   * @param {Object} position - The starting position
   * @param {Object} velocity - The initial velocity
   * @param {String} type - The type of projectile
   * @param {String} owner - The owner of the projectile
   * @returns {Object} - The created projectile
   */
  function createProjectile(position, velocity, type = 'cannonball', owner = null) {
    // Get projectile type properties
    const typeProps = projectileTypes[type] || projectileTypes.cannonball;
    
    // Create projectile object
    const projectile = {
      position: { ...position },
      velocity: { ...velocity },
      type,
      owner,
      radius: typeProps.radius,
      damage: typeProps.damage,
      timeToLive: typeProps.timeToLive,
      mesh: null
    };
    
    // Add fuse for TNT
    if (type === 'tnt') {
      projectile.fuse = typeProps.fuse;
    }
    
    // Create mesh
    const meshProps = typeProps.createMesh();
    const mesh = typeof THREE.Mesh === 'function'
      ? new THREE.Mesh(meshProps.geometry, meshProps.material)
      : { 
          position: { x: 0, y: 0, z: 0, set: (x, y, z) => { 
            mesh.position.x = x; 
            mesh.position.y = y; 
            mesh.position.z = z; 
          }}
        };
    
    if (mesh.position && mesh.position.set) {
      mesh.position.set(position.x, position.y, position.z);
    } else if (mesh.position) {
      mesh.position.x = position.x;
      mesh.position.y = position.y;
      mesh.position.z = position.z;
    }
    
    if (scene && scene.add) {
      scene.add(mesh);
    }
    
    projectile.mesh = mesh;
    
    // Add to projectiles array
    projectiles.push(projectile);
    
    return projectile;
  }
  
  /**
   * Update all projectiles
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  function update(deltaTime) {
    // Process each projectile
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i];
      
      // Update position
      projectile.position.x += projectile.velocity.x * deltaTime;
      projectile.position.y += projectile.velocity.y * deltaTime;
      projectile.position.z += projectile.velocity.z * deltaTime;
      
      // Apply gravity
      projectile.velocity.y -= 9.8 * deltaTime;
      
      // Update mesh position
      if (projectile.mesh && projectile.mesh.position) {
        if (projectile.mesh.position.set) {
          projectile.mesh.position.set(
            projectile.position.x,
            projectile.position.y,
            projectile.position.z
          );
        } else {
          projectile.mesh.position.x = projectile.position.x;
          projectile.mesh.position.y = projectile.position.y;
          projectile.mesh.position.z = projectile.position.z;
        }
      }
      
      // Check for TNT fuse
      if (projectile.fuse !== undefined) {
        projectile.fuse -= deltaTime;
        if (projectile.fuse <= 0) {
          // Explode TNT
          createExplosion(projectile);
          removeProjectile(i);
          continue;
        }
      }
      
      // Check for collisions with blocks
      const block = world && world.getBlockAt
        ? world.getBlockAt(
            Math.round(projectile.position.x),
            Math.round(projectile.position.y),
            Math.round(projectile.position.z)
          )
        : null;
      
      if (block) {
        // Hit a block
        createExplosion(projectile);
        removeProjectile(i);
        continue;
      }
      
      // Check for collisions with ships
      const ship = world && world.getShipAt
        ? world.getShipAt(
            projectile.position.x,
            projectile.position.y,
            projectile.position.z
          )
        : null;
      
      if (ship && ship.owner !== projectile.owner) {
        // Hit a ship that's not owned by the projectile owner
        if (ship.applyDamage) {
          ship.applyDamage(projectile.damage, projectile.position);
        }
        createExplosion(projectile);
        removeProjectile(i);
        continue;
      }
      
      // Check time to live
      projectile.timeToLive -= deltaTime;
      if (projectile.timeToLive <= 0) {
        removeProjectile(i);
      }
    }
  }
  
  /**
   * Create an explosion at the projectile's position
   * @param {Object} projectile - The projectile that exploded
   */
  function createExplosion(projectile) {
    if (explosionSystem && explosionSystem.createExplosion) {
      explosionSystem.createExplosion(
        projectile.position,
        projectile.type === 'tnt' ? 3 : 1, // TNT has larger explosion radius
        projectile.damage
      );
    }
  }
  
  /**
   * Remove a projectile by index
   * @param {Number} index - The index of the projectile to remove
   */
  function removeProjectile(index) {
    const projectile = projectiles[index];
    
    // Remove mesh from scene
    if (projectile.mesh && scene && scene.remove) {
      scene.remove(projectile.mesh);
      projectile.mesh = null;
    }
    
    // Remove from array
    projectiles.splice(index, 1);
  }
  
  /**
   * Clear all projectiles
   */
  function clear() {
    // Remove all projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      removeProjectile(i);
    }
  }
  
  // Return the public API
  return {
    projectiles,
    createProjectile,
    update,
    clear
  };
}

export default createProjectileSystem; 