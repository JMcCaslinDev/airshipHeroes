/**
 * Explosion Module
 * 
 * Handles explosion effects and damage.
 */

import * as THREE from 'three';

/**
 * Create an explosion at a given position
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} position - The position of the explosion {x, y, z}
 * @param {Object} options - Options for the explosion
 * @returns {Object} - The explosion object
 */
export function createExplosion(scene, position, options = {}) {
  const radius = options.radius || 2;
  const damage = options.damage || 1;
  const duration = options.duration || 1; // seconds
  const color = options.color || 0xff6600; // Orange
  
  // Create a sphere for the explosion
  const explosionGeometry = new THREE.SphereGeometry(radius, 16, 16);
  const explosionMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8
  });
  
  const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
  explosionMesh.position.set(position.x, position.y, position.z);
  scene.add(explosionMesh);
  
  // Create a point light for the explosion
  const light = new THREE.PointLight(color, 1, radius * 2);
  light.position.set(position.x, position.y, position.z);
  scene.add(light);
  
  // Create explosion object
  const explosion = {
    position,
    radius,
    damage,
    mesh: explosionMesh,
    light,
    startTime: Date.now(),
    duration: duration * 1000, // Convert to milliseconds
    isActive: true,
    
    /**
     * Update the explosion
     */
    update() {
      if (!this.isActive) return;
      
      // Calculate elapsed time
      const elapsed = Date.now() - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      
      // Update opacity and scale
      if (this.mesh) {
        this.mesh.material.opacity = 0.8 * (1 - progress);
        
        // Expand the explosion
        const scale = 1 + progress;
        this.mesh.scale.set(scale, scale, scale);
      }
      
      // Update light intensity
      if (this.light) {
        this.light.intensity = 1 * (1 - progress);
      }
      
      // Remove the explosion when done
      if (progress >= 1) {
        this.destroy();
      }
    },
    
    /**
     * Destroy the explosion
     */
    destroy() {
      if (!this.isActive) return;
      
      this.isActive = false;
      
      // Remove meshes from scene
      if (this.mesh && scene) {
        scene.remove(this.mesh);
        this.mesh = null;
      }
      
      if (this.light && scene) {
        scene.remove(this.light);
        this.light = null;
      }
    }
  };
  
  return explosion;
}

/**
 * Apply explosion damage to blocks
 * @param {Object} explosion - The explosion object
 * @param {Array} blocks - Array of blocks to check for damage
 */
export function applyExplosionDamage(explosion, blocks) {
  if (!explosion || !explosion.isActive) return;
  
  // Check each block for damage
  for (const block of blocks) {
    if (!block.position || block.isDestroyed) continue;
    
    // Calculate distance from explosion to block
    const distance = Math.sqrt(
      Math.pow(block.position.x - explosion.position.x, 2) +
      Math.pow(block.position.y - explosion.position.y, 2) +
      Math.pow(block.position.z - explosion.position.z, 2)
    );
    
    // Check if block is within explosion radius
    if (distance <= explosion.radius) {
      // Calculate damage based on distance (more damage closer to center)
      const damageMultiplier = 1 - (distance / explosion.radius);
      const damage = explosion.damage * damageMultiplier;
      
      // Apply damage to block
      if (block.takeDamage) {
        block.takeDamage(damage);
      }
      
      // Set fire to flammable blocks
      if (block.isFlammable && block.setOnFire) {
        block.setOnFire();
      }
    }
  }
}

/**
 * Create a particle effect for the explosion
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} position - The position of the explosion {x, y, z}
 * @param {Object} options - Options for the particles
 */
export function createExplosionParticles(scene, position, options = {}) {
  const count = options.count || 50;
  const speed = options.speed || 5;
  const size = options.size || 0.1;
  const color = options.color || 0xff6600; // Orange
  
  // Create particle geometry
  const particleGeometry = new THREE.BufferGeometry();
  const particleMaterial = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0.8
  });
  
  // Create particles
  const particles = [];
  const positions = [];
  const velocities = [];
  
  for (let i = 0; i < count; i++) {
    // Random position within a small sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = Math.random() * 0.5;
    
    const x = position.x + r * Math.sin(phi) * Math.cos(theta);
    const y = position.y + r * Math.sin(phi) * Math.sin(theta);
    const z = position.z + r * Math.cos(phi);
    
    positions.push(x, y, z);
    
    // Random velocity outward from center
    const vx = (x - position.x) * speed * (0.5 + Math.random());
    const vy = (y - position.y) * speed * (0.5 + Math.random());
    const vz = (z - position.z) * speed * (0.5 + Math.random());
    
    velocities.push(vx, vy, vz);
    
    particles.push({
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz },
      life: 1 + Math.random() // 1-2 seconds
    });
  }
  
  // Set particle positions
  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  // Create particle system
  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particleSystem);
  
  // Return particle system with update method
  return {
    particles,
    system: particleSystem,
    startTime: Date.now(),
    isActive: true,
    
    /**
     * Update the particles
     * @param {Number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
      if (!this.isActive) return;
      
      let allDead = true;
      const positions = [];
      
      // Update each particle
      for (let i = 0; i < this.particles.length; i++) {
        const particle = this.particles[i];
        
        // Update life
        particle.life -= deltaTime;
        
        if (particle.life > 0) {
          allDead = false;
          
          // Apply gravity
          particle.velocity.y -= 9.8 * deltaTime;
          
          // Update position
          particle.position.x += particle.velocity.x * deltaTime;
          particle.position.y += particle.velocity.y * deltaTime;
          particle.position.z += particle.velocity.z * deltaTime;
          
          // Add to positions array
          positions.push(particle.position.x, particle.position.y, particle.position.z);
        } else {
          // Dead particle - add last position
          positions.push(particle.position.x, particle.position.y, particle.position.z);
        }
      }
      
      // Update particle geometry
      particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      
      // Update opacity based on time
      const elapsed = Date.now() - this.startTime;
      particleMaterial.opacity = Math.max(0, 0.8 - (elapsed / 2000));
      
      // Remove the particle system when all particles are dead
      if (allDead || elapsed > 2000) {
        this.destroy();
      }
    },
    
    /**
     * Destroy the particle system
     */
    destroy() {
      if (!this.isActive) return;
      
      this.isActive = false;
      
      // Remove from scene
      if (this.system && scene) {
        scene.remove(this.system);
        this.system = null;
      }
    }
  };
} 