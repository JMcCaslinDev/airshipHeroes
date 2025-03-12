/**
 * Cannon Block Class
 * 
 * Cannon blocks shoot TNT blocks with a slight arc.
 * - Front-facing texture indicates firing direction.
 * - TNT explodes after 3 seconds, damaging enemy ships.
 * - Health: Equal to Engine Blocks (12 units).
 */

import * as THREE from 'three';
import BaseBlock from './baseBlock.js';

class CannonBlock extends BaseBlock {
  /**
   * Constructor for the CannonBlock class
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   */
  constructor(position, options = {}) {
    // Set health to 12 (equal to Engine Blocks)
    super(position, { ...options, health: 12 });
    
    this.type = 'cannon';
    this.isFlammable = false; // Cannon blocks are not flammable
    this.direction = options.direction || { x: 0, y: 0, z: -1 }; // Default direction (forward)
    this.cooldown = 0; // Cooldown timer for firing
    this.cooldownTime = options.cooldownTime || 3; // Seconds between shots
    this.projectileSpeed = options.projectileSpeed || 15; // Speed of fired TNT
    this.projectileArc = options.projectileArc || 0.2; // Vertical arc of fired TNT
  }

  /**
   * Create the Three.js mesh for this block
   * @param {THREE.Scene} scene - The Three.js scene to add the mesh to
   * @param {THREE.TextureLoader} textureLoader - The texture loader to use
   */
  createMesh(scene, textureLoader) {
    // Create a group to hold the cannon parts
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    
    // Create the base of the cannon (a cube)
    const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
    let baseMaterial;
    
    if (textureLoader) {
      // Try to load texture if available
      try {
        const texture = textureLoader.load('/textures/cannon_block.png');
        baseMaterial = new THREE.MeshStandardMaterial({ 
          map: texture,
          metalness: 0.6,
          roughness: 0.4
        });
      } catch (error) {
        console.warn('Failed to load cannon block texture, using default color', error);
        baseMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x333333, // Dark gray
          metalness: 0.6,
          roughness: 0.4
        });
      }
    } else {
      // Use default color if no texture loader
      baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333, // Dark gray
        metalness: 0.6,
        roughness: 0.4
      });
    }
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    
    // Create the cannon barrel (a cylinder)
    const barrelGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.8, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222, // Darker gray
      metalness: 0.7,
      roughness: 0.3
    });
    
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.castShadow = true;
    
    // Position and rotate the barrel based on the cannon direction
    if (this.direction.z === -1) {
      // Forward
      barrel.position.z = -0.5;
      barrel.rotation.x = Math.PI / 2;
    } else if (this.direction.z === 1) {
      // Backward
      barrel.position.z = 0.5;
      barrel.rotation.x = -Math.PI / 2;
    } else if (this.direction.x === 1) {
      // Right
      barrel.position.x = 0.5;
      barrel.rotation.z = -Math.PI / 2;
    } else if (this.direction.x === -1) {
      // Left
      barrel.position.x = -0.5;
      barrel.rotation.z = Math.PI / 2;
    }
    
    // Add the parts to the group
    this.mesh.add(base);
    this.mesh.add(barrel);
    
    // Store a reference to the block instance on the mesh
    this.mesh.userData.block = this;
    
    scene.add(this.mesh);
  }

  /**
   * Fire the cannon
   * @param {THREE.Scene} scene - The scene to add the projectile to
   * @param {Object} shipVelocity - The current velocity of the ship {x, y, z}
   * @returns {Object|null} - The projectile object if fired, null if on cooldown
   */
  fire(scene, shipVelocity = { x: 0, y: 0, z: 0 }) {
    // Check if cannon is on cooldown
    if (this.cooldown > 0) {
      return null;
    }
    
    // Set cooldown
    this.cooldown = this.cooldownTime;
    
    // Create TNT projectile
    const projectile = this.createProjectile(scene);
    
    // Calculate initial velocity (ship velocity + cannon direction * speed + arc)
    const velocity = {
      x: shipVelocity.x + this.direction.x * this.projectileSpeed,
      y: shipVelocity.y + this.projectileArc * this.projectileSpeed,
      z: shipVelocity.z + this.direction.z * this.projectileSpeed
    };
    
    // Store velocity on projectile
    projectile.userData.velocity = velocity;
    
    // Set fuse timer (3 seconds)
    projectile.userData.fuseTimer = 3;
    
    return projectile;
  }

  /**
   * Create a TNT projectile
   * @param {THREE.Scene} scene - The scene to add the projectile to
   * @returns {THREE.Mesh} - The projectile mesh
   */
  createProjectile(scene) {
    // Create TNT block
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
    const projectile = new THREE.Mesh(geometry, material);
    
    // Position at the end of the cannon barrel
    projectile.position.set(
      this.position.x + this.direction.x * 1.2,
      this.position.y + 0.2, // Slight upward offset
      this.position.z + this.direction.z * 1.2
    );
    
    // Add to scene
    scene.add(projectile);
    
    return projectile;
  }

  /**
   * Update method called every frame
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    // Update cooldown
    if (this.cooldown > 0) {
      this.cooldown -= deltaTime;
      if (this.cooldown < 0) {
        this.cooldown = 0;
      }
    }
  }
}

export default CannonBlock; 