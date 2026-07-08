/**
 * Block Factory
 * 
 * A factory for creating different types of blocks.
 * This centralizes block creation and makes it easier to add new block types.
 */

import * as THREE from 'three';
import { attachBlockEdges } from './blockEdgeOutline.js';
import {
  createEngineFlameMesh,
  updateEngineFlameMesh,
  disposeEngineFlameMesh,
  getFlameGridPosition
} from '../effects/engineFlame.js';
import { createRaptorEngineMaterials, createRaptorEngineGeometry, disposeRaptorEngineMaterials } from './engineTextures.js';
import { BLOCK_MAX_HEALTH, FLAMMABLE_TYPES } from '../combat/shipCombatConfig.js';
import { setBlockOnFire } from '../combat/fireSystem.js';

/** Redstone dust sits on the floor of its grid cell (not the cell center). */
export const REDSTONE_DUST_HEIGHT = 0.125;
export const REDSTONE_MESH_Y_OFFSET = 0.5 - REDSTONE_DUST_HEIGHT / 2;

export function getBlockMeshLocalPosition(block) {
  const { x, y, z } = block.position;
  if (block?.type === 'redstone') {
    return { x, y: y - REDSTONE_MESH_Y_OFFSET, z };
  }
  return { x, y, z };
}

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
    const maxHealth = BLOCK_MAX_HEALTH[normalizedType] ?? 10;
    
    // Create a generic block with the specified type
    const block = {
      type: normalizedType,
      position: { ...position },
      health: options.health ?? maxHealth,
      maxHealth,
      isFlammable: FLAMMABLE_TYPES.has(normalizedType),
      isBurning: false,
      burnTimer: 0,
      spreadTimer: 0,
      dispenserCooldown: 0,
      rotation: options.rotation || 0,
      mesh: null,

      setOnFire() {
        return setBlockOnFire(this);
      },

      takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
          this.isDestroyed = true;
          if (this.mesh?.parent) {
            this.mesh.parent.remove(this.mesh);
          }
          return true;
        }
        const ratio = this.health / this.maxHealth;
        if (this.mesh?.material?.color) {
          this.mesh.material.color.setRGB(ratio, ratio * 0.85, ratio * 0.85);
        }
        return false;
      },
      
      // For engine blocks, add direction and thrust-related properties
      ...(normalizedType === 'engine' ? {
        direction: options.direction || { x: 0, y: 0, z: -1 },
        flameMesh: null,
        thrustPower: options.thrustPower || 1,

        setFlameActive(active) {
          if (this.flameMesh) {
            this.flameMesh.visible = !!active;
          }
        },

        updateFlame(deltaTime) {
          if (this.flameMesh?.visible) {
            updateEngineFlameMesh(this.flameMesh, deltaTime);
          }
        },

        disposeFlame() {
          disposeEngineFlameMesh(this.flameMesh);
          this.flameMesh = null;
        },

        attachFlame(group) {
          if (!group || !this.direction || this.flameMesh) {
            return;
          }
          this.flameMesh = createEngineFlameMesh(this.direction);
          const flamePos = getFlameGridPosition(this.position, this.direction);
          this.flameMesh.position.set(flamePos.x, flamePos.y, flamePos.z);
          group.add(this.flameMesh);
        },

        disposeEngineMaterials() {
          if (this.engineMaterials) {
            disposeRaptorEngineMaterials(this.engineMaterials);
            this.engineMaterials = null;
          }
        },
      } : {}),
      
      // Create mesh for the block
      createMesh(group, textureLoader) {
        const isRedstoneDust = this.type === 'redstone';
        let geometry = isRedstoneDust
          ? new THREE.BoxGeometry(1, REDSTONE_DUST_HEIGHT, 1)
          : new THREE.BoxGeometry(1, 1, 1);
        let material;

        if (this.type === 'engine') {
          geometry = createRaptorEngineGeometry();
          this.engineMaterials = createRaptorEngineMaterials();
          material = this.engineMaterials[0];
        } else {
          let texture;
          try {
            if (textureLoader && typeof textureLoader.get === 'function') {
              texture = textureLoader.get(this.type);
            }
          } catch (error) {
            console.error(`Failed to load texture for block type: ${this.type}`, error);
          }

          if (texture) {
            material = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: isRedstoneDust ? 0.9 : 0.7,
              metalness: isRedstoneDust ? 0.05 : 0.2,
              ...(isRedstoneDust ? { emissive: 0x000000, emissiveIntensity: 0 } : {})
            });
          } else {
            material = new THREE.MeshStandardMaterial({
              color: this.getDefaultColor(),
              roughness: 0.7,
              metalness: 0.2
            });
          }
        }

        this.mesh = new THREE.Mesh(geometry, material);
        if (this.type !== 'engine' && !isRedstoneDust) {
          attachBlockEdges(this.mesh);
        }

        const meshPos = getBlockMeshLocalPosition(this);
        this.mesh.position.set(meshPos.x, meshPos.y, meshPos.z);

        if (this.type === 'engine' && this.direction) {
          const dir = new THREE.Vector3(this.direction.x, this.direction.y, this.direction.z);
          if (dir.lengthSq() > 0.001) {
            dir.normalize();
            this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
          }
        } else if (this.rotation) {
          this.mesh.rotation.y = this.rotation;
        }

        if (this.type === 'engine' && this.direction && group) {
          this.attachFlame(group);
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
          case 'wood': return 0xBC986A;
          case 'stone': return 0x7F7F7F;
          case 'lift': return 0xE9ECEC;
          case 'armor': return 0x985E2D;
          case 'cannon': return 0x7F7F7F;
          case 'control': return 0x6B4423;
          case 'engine': return 0x1c1c20;
          case 'dispenser': return 0x6e6e6e;
          case 'redstone': return 0xb83232;
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
    if (!blocks || blocks.length === 0) {
      return false;
    }
    const liftCount = blocks.filter((block) => block.type === 'lift').length;
    return liftCount / blocks.length >= 0.25;
  }
}

export default BlockFactory; 