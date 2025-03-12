/**
 * World Generator Module
 * 
 * Handles generation of the game world.
 */

import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';

// World generation constants
const WORLD_RADIUS = 500; // Radius of the circular world
const MAX_HEIGHT = 100; // Maximum terrain height
const WATER_LEVEL = 20; // Water level

/**
 * Generate a circular world with terrain
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} options - Options for world generation
 * @returns {Object} - The generated world
 */
export function generateWorld(scene, options = {}) {
  const radius = options.radius || WORLD_RADIUS;
  const maxHeight = options.maxHeight || MAX_HEIGHT;
  const waterLevel = options.waterLevel || WATER_LEVEL;
  const seed = options.seed || Math.random();
  
  // Create noise generator
  const simplex = new SimplexNoise(seed);
  
  // Create world object
  const world = {
    radius,
    maxHeight,
    waterLevel,
    heightMap: [],
    terrainMesh: null,
    waterMesh: null,
    
    /**
     * Generate the terrain height map
     * @param {Number} resolution - Resolution of the height map
     */
    generateHeightMap(resolution = 1) {
      const size = radius * 2;
      const gridSize = Math.ceil(size / resolution);
      
      // Initialize height map
      this.heightMap = new Array(gridSize);
      for (let i = 0; i < gridSize; i++) {
        this.heightMap[i] = new Array(gridSize);
      }
      
      // Generate height values
      for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
          // Convert to world coordinates
          const worldX = (x - gridSize / 2) * resolution;
          const worldZ = (z - gridSize / 2) * resolution;
          
          // Calculate distance from center
          const distanceFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
          
          // Skip if outside world radius
          if (distanceFromCenter > radius) {
            this.heightMap[x][z] = -1; // Mark as outside world
            continue;
          }
          
          // Generate height using multiple octaves of noise
          let height = 0;
          let amplitude = 1;
          let frequency = 0.005;
          
          for (let octave = 0; octave < 4; octave++) {
            const noiseValue = simplex.noise2D(worldX * frequency, worldZ * frequency);
            height += noiseValue * amplitude;
            
            amplitude *= 0.5;
            frequency *= 2;
          }
          
          // Scale height to range [0, maxHeight]
          height = (height + 1) * 0.5 * maxHeight;
          
          // Apply falloff near the edges
          const falloff = 1 - Math.pow(distanceFromCenter / radius, 2);
          height *= falloff;
          
          // Store height
          this.heightMap[x][z] = height;
        }
      }
      
      return this.heightMap;
    },
    
    /**
     * Create the terrain mesh
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {THREE.TextureLoader} textureLoader - The texture loader
     */
    createTerrainMesh(scene, textureLoader) {
      if (!this.heightMap || this.heightMap.length === 0) {
        this.generateHeightMap();
      }
      
      const gridSize = this.heightMap.length;
      const resolution = (radius * 2) / gridSize;
      
      // Create geometry
      const geometry = new THREE.PlaneGeometry(
        radius * 2,
        radius * 2,
        gridSize - 1,
        gridSize - 1
      );
      
      // Rotate to be horizontal
      geometry.rotateX(-Math.PI / 2);
      
      // Get vertices
      const vertices = geometry.attributes.position.array;
      
      // Update vertices based on height map
      for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        const x = Math.floor(j % gridSize);
        const z = Math.floor(j / gridSize);
        
        // Skip if outside world radius
        if (x >= gridSize || z >= gridSize || this.heightMap[x][z] === -1) {
          continue;
        }
        
        // Set height
        vertices[i + 1] = this.heightMap[x][z];
      }
      
      // Update normals
      geometry.computeVertexNormals();
      
      // Create material
      let material;
      
      if (textureLoader) {
        // Try to load texture if available
        try {
          const texture = textureLoader.load('/textures/terrain.png');
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(gridSize / 10, gridSize / 10);
          
          material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.2
          });
        } catch (error) {
          console.warn('Failed to load terrain texture, using default color', error);
          material = new THREE.MeshStandardMaterial({
            color: 0x228B22, // Forest green
            roughness: 0.8,
            metalness: 0.2
          });
        }
      } else {
        // Use default color if no texture loader
        material = new THREE.MeshStandardMaterial({
          color: 0x228B22, // Forest green
          roughness: 0.8,
          metalness: 0.2
        });
      }
      
      // Create mesh
      this.terrainMesh = new THREE.Mesh(geometry, material);
      this.terrainMesh.receiveShadow = true;
      
      // Add to scene
      scene.add(this.terrainMesh);
      
      return this.terrainMesh;
    },
    
    /**
     * Create the water mesh
     * @param {THREE.Scene} scene - The Three.js scene
     */
    createWaterMesh(scene) {
      // Create geometry
      const geometry = new THREE.CircleGeometry(radius, 64);
      
      // Create material
      const material = new THREE.MeshStandardMaterial({
        color: 0x0077be, // Water blue
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        metalness: 0.3
      });
      
      // Create mesh
      this.waterMesh = new THREE.Mesh(geometry, material);
      this.waterMesh.rotation.x = -Math.PI / 2;
      this.waterMesh.position.y = waterLevel;
      
      // Add to scene
      scene.add(this.waterMesh);
      
      return this.waterMesh;
    },
    
    /**
     * Get the height at a given position
     * @param {Number} x - X coordinate
     * @param {Number} z - Z coordinate
     * @returns {Number} - The height at the position, or -1 if outside world
     */
    getHeightAt(x, z) {
      if (!this.heightMap || this.heightMap.length === 0) {
        return 0;
      }
      
      const gridSize = this.heightMap.length;
      const resolution = (radius * 2) / gridSize;
      
      // Convert world coordinates to grid coordinates
      const gridX = Math.floor((x + radius) / resolution);
      const gridZ = Math.floor((z + radius) / resolution);
      
      // Check if within bounds
      if (gridX < 0 || gridX >= gridSize || gridZ < 0 || gridZ >= gridSize) {
        return -1;
      }
      
      return this.heightMap[gridX][gridZ];
    },
    
    /**
     * Check if a position is within the world
     * @param {Number} x - X coordinate
     * @param {Number} z - Z coordinate
     * @returns {Boolean} - Whether the position is within the world
     */
    isWithinWorld(x, z) {
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      return distanceFromCenter <= radius;
    },
    
    /**
     * Update the world
     * @param {Number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
      // Update water animation
      if (this.waterMesh) {
        // Animate water by slightly moving it up and down
        this.waterMesh.position.y = waterLevel + Math.sin(Date.now() * 0.001) * 0.2;
      }
    }
  };
  
  return world;
}

/**
 * Add trees to the world
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} world - The world object
 * @param {Object} options - Options for tree generation
 */
export function addTrees(scene, world, options = {}) {
  const count = options.count || 100;
  const minHeight = options.minHeight || 30;
  const maxHeight = options.maxHeight || 80;
  const seed = options.seed || Math.random();
  
  // Create noise generator for tree placement
  const simplex = new SimplexNoise(seed);
  
  // Create tree instances
  const trees = [];
  
  // Create tree geometry and materials
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
  
  const leavesGeometry = new THREE.ConeGeometry(1, 2, 8);
  const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Green
  
  // Create instanced meshes for better performance
  const trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, count);
  const leavesMesh = new THREE.InstancedMesh(leavesGeometry, leavesMaterial, count);
  
  trunkMesh.castShadow = true;
  leavesMesh.castShadow = true;
  
  // Matrix for positioning instances
  const matrix = new THREE.Matrix4();
  
  // Place trees
  let instanceCount = 0;
  
  for (let i = 0; i < count * 10 && instanceCount < count; i++) {
    // Random position within world radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * world.radius * 0.9; // Keep away from edge
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    // Get height at position
    const y = world.getHeightAt(x, z);
    
    // Skip if outside world or underwater
    if (y === -1 || y < world.waterLevel) {
      continue;
    }
    
    // Skip if too high or too low
    if (y < minHeight || y > maxHeight) {
      continue;
    }
    
    // Use noise to determine if a tree should be placed here
    const noiseValue = simplex.noise2D(x * 0.01, z * 0.01);
    
    if (noiseValue < 0.3) {
      continue;
    }
    
    // Random scale for variety
    const scale = 0.8 + Math.random() * 0.4;
    
    // Position trunk
    matrix.makeScale(scale, scale, scale);
    matrix.setPosition(x, y + 0.75 * scale, z);
    trunkMesh.setMatrixAt(instanceCount, matrix);
    
    // Position leaves
    matrix.makeScale(scale, scale, scale);
    matrix.setPosition(x, y + 2 * scale, z);
    leavesMesh.setMatrixAt(instanceCount, matrix);
    
    instanceCount++;
  }
  
  // Add to scene
  scene.add(trunkMesh);
  scene.add(leavesMesh);
  
  return { trunkMesh, leavesMesh };
}

/**
 * Add rocks to the world
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} world - The world object
 * @param {Object} options - Options for rock generation
 */
export function addRocks(scene, world, options = {}) {
  const count = options.count || 50;
  const seed = options.seed || Math.random();
  
  // Create noise generator for rock placement
  const simplex = new SimplexNoise(seed);
  
  // Create rock instances
  const rocks = [];
  
  // Create rock geometries for variety
  const rockGeometries = [
    new THREE.DodecahedronGeometry(0.5, 0),
    new THREE.DodecahedronGeometry(0.5, 1),
    new THREE.DodecahedronGeometry(0.5, 2)
  ];
  
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080, // Gray
    roughness: 0.9,
    metalness: 0.1
  });
  
  // Create instanced meshes for better performance
  const rockMeshes = rockGeometries.map(geometry => {
    const mesh = new THREE.InstancedMesh(geometry, rockMaterial, Math.floor(count / 3));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  });
  
  // Matrix for positioning instances
  const matrix = new THREE.Matrix4();
  
  // Place rocks
  let instanceCounts = [0, 0, 0];
  
  for (let i = 0; i < count * 5 && instanceCounts.reduce((a, b) => a + b, 0) < count; i++) {
    // Random position within world radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * world.radius * 0.95;
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    // Get height at position
    const y = world.getHeightAt(x, z);
    
    // Skip if outside world or underwater
    if (y === -1 || y < world.waterLevel) {
      continue;
    }
    
    // Use noise to determine if a rock should be placed here
    const noiseValue = simplex.noise2D(x * 0.02, z * 0.02);
    
    if (noiseValue < 0) {
      continue;
    }
    
    // Random rock type
    const rockType = Math.floor(Math.random() * rockGeometries.length);
    
    // Skip if too many of this type
    if (instanceCounts[rockType] >= Math.floor(count / 3)) {
      continue;
    }
    
    // Random scale for variety
    const scale = 0.5 + Math.random() * 1.5;
    
    // Random rotation
    const rotationY = Math.random() * Math.PI * 2;
    
    // Position rock
    matrix.makeRotationY(rotationY);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    matrix.setPosition(x, y + scale * 0.25, z);
    
    rockMeshes[rockType].setMatrixAt(instanceCounts[rockType], matrix);
    instanceCounts[rockType]++;
  }
  
  // Add to scene
  rockMeshes.forEach(mesh => scene.add(mesh));
  
  return rockMeshes;
} 