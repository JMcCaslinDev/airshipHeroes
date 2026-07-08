/**
 * Projectile Class
 * 
 * Represents a projectile in the game (e.g., TNT block fired from a cannon).
 */

import * as THREE from 'three';

class Projectile {
  /**
   * Constructor for the Projectile class
   * @param {Object} options - Options for the projectile
   */
  constructor(options = {}) {
    this.position = options.position || { x: 0, y: 0, z: 0 };
    this.velocity = options.velocity || { x: 0, y: 0, z: 0 };
    this.fuseTimer = options.fuseTimer !== undefined ? options.fuseTimer : 3; // 3 seconds by default
    this.damage = options.damage || 1;
    this.radius = options.radius || 0.25; // Half the size of a TNT block
    this.owner = options.owner || null; // Player who fired the projectile
    this.mesh = null;
    this.isDestroyed = false;
    this.scene = options.scene || null;
    this.onExplode = options.onExplode || null; // Callback for explosion
  }

  /**
   * Create the Three.js mesh for this projectile
   * @param {THREE.Scene} scene - The Three.js scene to add the mesh to
   * @param {THREE.TextureLoader} textureLoader - The texture loader to use
   */
  createMesh(scene, textureLoader) {
    // Store the scene for later use
    this.scene = scene;
    
    // Create a simple cube for the TNT block
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    
    let material;
    
    if (textureLoader) {
      // Try to load texture if available
      try {
        const texture = textureLoader.load('/textures/tnt_block.png');
        material = new THREE.MeshStandardMaterial({ map: texture });
      } catch (error) {
        console.warn('Failed to load TNT texture, using default color', error);
        material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
      }
    } else {
      // Use default color if no texture loader
      material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
    }
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.castShadow = true;
    
    // Store a reference to the projectile instance on the mesh
    this.mesh.userData.projectile = this;
    
    scene.add(this.mesh);
    
    return this.mesh;
  }

  /**
   * Update the projectile's position and state
   * @param {Number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    if (this.isDestroyed) return;
    
    // Update position based on velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
    
    // Apply gravity
    this.velocity.y -= 9.8 * deltaTime;
    
    // Update mesh position
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
      
      // Add rotation for visual effect
      this.mesh.rotation.x += deltaTime * 2;
      this.mesh.rotation.z += deltaTime * 2;
    }
    
    // Update fuse timer
    this.fuseTimer -= deltaTime;
    
    // Explode if the fuse timer reaches zero
    if (this.fuseTimer <= 0) {
      this.explode();
    }
  }

  /**
   * Explode the projectile
   */
  explode() {
    if (this.isDestroyed) return;
    
    // Mark as destroyed
    this.isDestroyed = true;
    
    // Create explosion effect
    this.createExplosionEffect();
    
    // Call the onExplode callback if provided
    if (this.onExplode) {
      this.onExplode(this.position, this.damage, this.owner);
    }
    
    // Remove the mesh from the scene
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
  }

  /**
   * Create a visual explosion effect
   */
  createExplosionEffect() {
    if (!this.scene) return;
    
    // Create a sphere for the explosion
    const explosionGeometry = new THREE.SphereGeometry(2, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.set(this.position.x, this.position.y, this.position.z);
    this.scene.add(explosion);
    
    // Animate the explosion
    let scale = 1;
    const expandInterval = setInterval(() => {
      scale += 0.2;
      explosion.scale.set(scale, scale, scale);
      explosionMaterial.opacity -= 0.05;
      
      if (explosionMaterial.opacity <= 0) {
        clearInterval(expandInterval);
        this.scene.remove(explosion);
      }
    }, 50);
  }

  /**
   * Destroy the projectile without exploding
   */
  destroy() {
    if (this.isDestroyed) return;
    
    // Mark as destroyed
    this.isDestroyed = true;
    
    // Remove the mesh from the scene
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
  }
}

export default Projectile; 