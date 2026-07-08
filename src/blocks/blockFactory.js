/**
 * Block Factory
 * 
 * A factory for creating different types of blocks.
 * This centralizes block creation and makes it easier to add new block types.
 */

import * as THREE from 'three';

class BlockFactory {
  /**
   * Create a block of the specified type
   * @param {String} type - The type of block to create ('lift', 'wood', 'stone', 'cannon', 'control', 'engine')
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   * @returns {Object} - The created block
   */
  static createBlock(type, position, options = {}) {
    // Normalize the type to lowercase
    const normalizedType = type.toLowerCase();
    
    // Create a generic block with the specified type
    const block = {
      type: normalizedType,
      position: { ...position },
      health: options.health || 100,
      rotation: options.rotation || 0,
      mesh: null,
      
      // For engine blocks, add direction and thrust-related properties
      ...(normalizedType === 'engine' ? {
        direction: options.direction || { x: 0, y: 0, z: -1 }, // Default direction (forward)
        isActive: false,
        thrustPower: options.thrustPower || 1,
        
        // Set engine active state
        setActive(active) {
          this.isActive = active;
        },
        
        // Calculate thrust provided by this engine
        calculateThrust() {
          if (!this.isActive) {
            return { x: 0, y: 0, z: 0 };
          }
          
          return {
            x: this.direction.x * this.thrustPower,
            y: this.direction.y * this.thrustPower,
            z: this.direction.z * this.thrustPower
          };
        }
      } : {}),
      
      // Create mesh for the block
      createMesh(group, textureLoader) {
        // Create geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Get texture for the block type
        let texture;
        try {
          if (textureLoader && typeof textureLoader.get === 'function') {
            texture = textureLoader.get(this.type);
            console.log(`Successfully loaded texture for block type: ${this.type}`);
          } else {
            console.warn(`TextureLoader not available or missing get method for block type: ${this.type}`);
          }
        } catch (error) {
          console.error(`Failed to load texture for block type: ${this.type}`, error);
        }
        
        // Create material
        let material;
        if (texture) {
          material = new THREE.MeshStandardMaterial({ 
            map: texture,
            // Add these properties to improve texture appearance
            roughness: 0.7,
            metalness: 0.2
          });
        } else {
          // Use default color if texture loading failed
          const color = this.getDefaultColor();
          console.warn(`Using default color ${color.toString(16)} for block type: ${this.type}`);
          material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7,
            metalness: 0.2
          });
        }
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Set position
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        
        // Set rotation if specified
        if (this.rotation) {
          this.mesh.rotation.y = this.rotation;
        }
        
        // For engine blocks, add a visual indicator of direction
        if (this.type === 'engine' && this.direction) {
          // Add a small cone to indicate thrust direction
          const coneGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
          const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
          const cone = new THREE.Mesh(coneGeometry, coneMaterial);
          
          // Position the cone based on the engine direction
          cone.position.set(
            this.direction.x * 0.7,
            this.direction.y * 0.7,
            this.direction.z * 0.7
          );
          
          // Rotate the cone to point in the direction of thrust
          if (this.direction.z === -1) {
            // Forward
            cone.rotation.x = Math.PI;
          } else if (this.direction.z === 1) {
            // Backward
            // No rotation needed, default cone points up
          } else if (this.direction.x === 1) {
            // Right
            cone.rotation.z = -Math.PI / 2;
          } else if (this.direction.x === -1) {
            // Left
            cone.rotation.z = Math.PI / 2;
          }
          
          this.mesh.add(cone);
        }
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Set userData to reference this block
        this.mesh.userData.block = this;
        this.mesh.userData.isBlock = true;
        this.mesh.userData.type = this.type;
        this.mesh.userData.gridPosition = { ...this.position };
        
        // Add to group
        if (group) {
          // Check if the mesh is already in the group
          if (this.mesh.parent !== group) {
            // Remove from current parent if it exists
            if (this.mesh.parent) {
              this.mesh.parent.remove(this.mesh);
            }
            
            // Add to the group
            group.add(this.mesh);
            
            // Force update the world matrix to ensure correct positioning
            this.mesh.updateMatrixWorld(true);
            
            console.log(`Added mesh for ${this.type} block to group at position:`, this.position);
          } else {
            console.log(`Mesh for ${this.type} block is already in the group`);
          }
        } else {
          console.error("No group provided to add mesh to");
          
          // Try to find a scene to add the mesh to
          if (window.renderer && window.renderer.scene) {
            console.log("Found scene from window.renderer, adding mesh directly");
            window.renderer.scene.add(this.mesh);
          }
        }
        
        // Ensure the mesh is visible
        this.mesh.visible = true;
        
        return this.mesh;
      },
      
      // Get default color for the block type
      getDefaultColor() {
        switch (this.type) {
          case 'wood': return 0x8B4513;
          case 'stone': return 0x808080;
          case 'lift': return 0xFFD700;
          case 'cannon': return 0x696969;
          case 'control': return 0x8B0000;
          case 'engine': return 0x444444; // Dark gray for engines
          default: return 0xAAAAAA;
        }
      },
      
      // Get the world position of this block
      getWorldPosition(ship) {
        if (!ship) return { ...this.position };
        
        // Use ship's transformation function if available
        if (ship?.localToWorldPosition) {
          return ship.localToWorldPosition(this.position);
        }
        
        if (ship?.transform?.localToWorldPosition) {
          return ship.transform.localToWorldPosition(this.position);
        }
        
        // Fallback to simple addition if ship doesn't have transformation function
        return {
          x: ship.position.x + this.position.x,
          y: ship.position.y + this.position.y,
          z: ship.position.z + this.position.z
        };
      },
      
      // World-space AABB (rendering / raycast). Player walking uses ship-local grid boxes.
      getCollisionBox(ship) {
        const box = new THREE.Box3();

        if (this.mesh) {
          if (ship?.group) {
            ship.group.updateMatrixWorld(true);
          }
          this.mesh.updateMatrixWorld(true);
          const localBox = new THREE.Box3(
            new THREE.Vector3(-0.5, -0.5, -0.5),
            new THREE.Vector3(0.5, 0.5, 0.5)
          );
          box.copy(localBox).applyMatrix4(this.mesh.matrixWorld);
          return box;
        }

        const worldPos = this.getWorldPosition(ship);
        box.min.set(
          worldPos.x - 0.5,
          worldPos.y - 0.5,
          worldPos.z - 0.5
        );
        box.max.set(
          worldPos.x + 0.5,
          worldPos.y + 0.5,
          worldPos.z + 0.5
        );

        return box;
      }
    };
    
    return block;
  }

  /**
   * Create blocks from a ship definition
   * @param {Object} shipDefinition - The ship definition object
   * @returns {Array} - Array of created blocks
   */
  static createBlocksFromShipDefinition(shipDefinition) {
    const blocks = [];
    
    if (!shipDefinition || !shipDefinition.blocks || !Array.isArray(shipDefinition.blocks)) {
      console.error('Invalid ship definition');
      return blocks;
    }
    
    // Create each block from the definition
    for (const blockDef of shipDefinition.blocks) {
      // Handle both formats: {type, x, y, z} and {type, position: {x, y, z}}
      let position;
      let options = { ...blockDef };
      
      if (blockDef.position) {
        // Format: {type, position: {x, y, z}}
        position = { ...blockDef.position };
        delete options.position;
      } else if (blockDef.x !== undefined && blockDef.y !== undefined && blockDef.z !== undefined) {
        // Format: {type, x, y, z}
        position = { x: blockDef.x, y: blockDef.y, z: blockDef.z };
        delete options.x;
        delete options.y;
        delete options.z;
      } else {
        console.warn('Skipping invalid block definition', blockDef);
        continue;
      }
      
      const { type } = blockDef;
      
      if (!type || !position) {
        console.warn('Skipping invalid block definition', blockDef);
        continue;
      }
      
      const block = this.createBlock(type, position, options);
      if (block) {
        blocks.push(block);
      }
    }
    
    return blocks;
  }

  /**
   * Count the number of blocks of each type in an array of blocks
   * @param {Array} blocks - Array of blocks
   * @returns {Object} - Object with counts for each block type
   */
  static countBlockTypes(blocks) {
    const counts = {
      lift: 0,
      wood: 0,
      stone: 0,
      cannon: 0,
      control: 0,
      total: blocks.length
    };
    
    for (const block of blocks) {
      if (counts[block.type] !== undefined) {
        counts[block.type]++;
      }
    }
    
    return counts;
  }

  /**
   * Check if a ship has enough lift blocks (at least 30% of total)
   * @param {Array} blocks - Array of blocks
   * @returns {Boolean} - Whether the ship has enough lift blocks
   */
  static hasEnoughLift(blocks) {
    const counts = this.countBlockTypes(blocks);
    return counts.lift >= counts.total * 0.3;
  }
}

export default BlockFactory; 