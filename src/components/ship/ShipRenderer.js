/**
 * ShipRenderer Class
 * 
 * Handles rendering and mesh management for a ship.
 */

import * as THREE from 'three';

class ShipRenderer {
  /**
   * Constructor for the ShipRenderer class
   * @param {Ship} ship - The ship this renderer belongs to
   */
  constructor(ship) {
    this.ship = ship;
  }

  /**
   * Validate and fix block-mesh position consistency
   * This ensures that block meshes are positioned correctly according to their logical positions
   * @returns {Number} - The number of fixed positions
   */
  validateBlockMeshPositions() {
    console.log("Validating block-mesh positions...");
    
    let fixedCount = 0;
    
    for (const block of this.ship.blockManager.blocks) {
      if (!block.mesh) continue;
      
      // The mesh position should match the block's logical position
      // No need to apply ship rotation here as the mesh is a child of the ship group
      // which already has the rotation applied
      const expectedPosition = {
        x: block.position.x,
        y: block.position.y,
        z: block.position.z
      };
      
      // Check if the mesh position matches the expected position
      const currentPosition = {
        x: block.mesh.position.x,
        y: block.mesh.position.y,
        z: block.mesh.position.z
      };
      
      // Calculate the difference
      const diff = {
        x: Math.abs(currentPosition.x - expectedPosition.x),
        y: Math.abs(currentPosition.y - expectedPosition.y),
        z: Math.abs(currentPosition.z - expectedPosition.z)
      };
      
      // If the difference is significant, fix the mesh position
      const threshold = 0.01; // Small threshold to account for floating point errors
      if (diff.x > threshold || diff.y > threshold || diff.z > threshold) {
        console.log(`Fixing mesh position for block at ${JSON.stringify(block.position)}`);
        console.log(`  Current: ${JSON.stringify(currentPosition)}`);
        console.log(`  Expected: ${JSON.stringify(expectedPosition)}`);
        
        // Set the mesh position to match the block position
        block.mesh.position.set(
          expectedPosition.x,
          expectedPosition.y,
          expectedPosition.z
        );
        
        fixedCount++;
      }
    }
    
    console.log(`Validation complete. Fixed ${fixedCount} block mesh positions.`);
    return fixedCount;
  }

  /**
   * Clean up orphaned meshes and ensure block-mesh consistency
   * This should be called periodically to prevent ghost blocks
   * @returns {Object} - Statistics about the cleanup operation
   */
  cleanupOrphanedMeshes() {
    console.log("Cleaning up orphaned meshes...");
    
    // Step 1: Find all meshes in the group
    const meshes = [];
    this.ship.group.traverse(child => {
      if (child.isMesh && child.userData.isBlock) {
        meshes.push(child);
      }
    });
    
    console.log(`Found ${meshes.length} meshes in ship group`);
    
    // Step 2: Check each mesh to see if it has a corresponding block
    let orphanedMeshCount = 0;
    for (const mesh of meshes) {
      // Get the world position of the mesh
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      
      // Convert to ship-local coordinates
      const localPos = this.ship.transform.worldToLocalPosition({
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z
      });
      
      // Round to grid coordinates
      const gridPos = {
        x: Math.round(localPos.x),
        y: Math.round(localPos.y),
        z: Math.round(localPos.z)
      };
      
      // Check if there's a block at this position
      const blockExists = this.ship.blockManager.getBlockAtLocalPosition(gridPos);
      
      // If no block exists at this position, remove the mesh
      if (!blockExists) {
        console.log(`Removing orphaned mesh at local position: ${gridPos.x}, ${gridPos.y}, ${gridPos.z}`);
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }
        orphanedMeshCount++;
      }
    }
    
    // Step 3: Check for blocks without meshes
    let blocksWithoutMeshCount = 0;
    for (const block of this.ship.blockManager.blocks) {
      if (!block.mesh || !block.mesh.parent) {
        console.log(`Found block without mesh at position: ${block.position.x}, ${block.position.y}, ${block.position.z}`);
        blocksWithoutMeshCount++;
        
        // Recreate the mesh for this block if we have a resource loader
        if (window.resourceLoader) {
          block.createMesh(this.ship.group, window.resourceLoader);
          console.log("Recreated mesh for block");
        }
      }
    }
    
    // Step 4: Validate and fix block-mesh positions
    const fixedPositionsCount = this.validateBlockMeshPositions();
    
    console.log(`Cleanup complete. Removed ${orphanedMeshCount} orphaned meshes, found ${blocksWithoutMeshCount} blocks without meshes, and fixed ${fixedPositionsCount} mesh positions.`);
    
    return { orphanedMeshCount, blocksWithoutMeshCount, fixedPositionsCount };
  }

  /**
   * Update all block meshes to match their logical positions
   * This ensures visual representation matches the logical state
   * @returns {Number} - The number of updated meshes
   */
  updateBlockMeshes() {
    console.log("Updating block meshes...");
    
    let updatedCount = 0;
    
    // First, check if the ship group is in the scene
    if (!this.ship.group.parent) {
      console.error("Ship group is not in any scene! Cannot update meshes properly.");
      // Try to find the scene from the window object
      if (window.renderer && window.renderer.scene) {
        console.log("Found scene from window.renderer, adding ship group");
        window.renderer.scene.add(this.ship.group);
      }
    }
    
    for (const block of this.ship.blockManager.blocks) {
      if (!block.mesh) {
        console.log(`Block at position ${JSON.stringify(block.position)} has no mesh, creating one`);
        
        // Try to create a mesh if we have a resource loader
        if (window.resourceLoader) {
          try {
            // Create mesh for the block
            if (typeof block.createMesh === 'function') {
              block.createMesh(this.ship.group, window.resourceLoader);
              console.log(`Created mesh for block at position ${JSON.stringify(block.position)}`);
              
              // Ensure the mesh is visible
              if (block.mesh) {
                block.mesh.visible = true;
                
                // Force update the world matrix
                block.mesh.updateMatrixWorld(true);
                
                updatedCount++;
              } else {
                console.warn(`Failed to create mesh for block at position ${JSON.stringify(block.position)}`);
              }
            } else {
              console.error(`Block at position ${JSON.stringify(block.position)} does not have createMesh method`);
            }
          } catch (error) {
            console.error(`Failed to create mesh for block at position ${JSON.stringify(block.position)}:`, error);
          }
        } else {
          console.warn(`Cannot create mesh for block at position ${JSON.stringify(block.position)} - no resource loader available`);
        }
        
        continue;
      }
      
      // Set the mesh position to match the block's logical position
      block.mesh.position.set(
        block.position.x,
        block.position.y,
        block.position.z
      );
      
      // Set rotation if specified
      if (block.rotation) {
        block.mesh.rotation.y = block.rotation;
      }
      
      // Ensure the mesh is visible
      block.mesh.visible = true;
      
      // Check if the mesh has a material
      if (!block.mesh.material) {
        console.warn(`Block at position ${JSON.stringify(block.position)} has no material, attempting to create one`);
        
        // Try to create a material if we have a resource loader
        if (window.resourceLoader) {
          try {
            const texture = window.resourceLoader.get(block.type);
            if (texture) {
              block.mesh.material = new THREE.MeshStandardMaterial({ 
                map: texture,
                roughness: 0.7,
                metalness: 0.2
              });
              console.log(`Created material with texture for block at position ${JSON.stringify(block.position)}`);
            } else {
              // Use default color if texture loading failed
              const color = block.getDefaultColor ? block.getDefaultColor() : this.getDefaultColorForType(block.type);
              block.mesh.material = new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.7,
                metalness: 0.2
              });
              console.log(`Created material with default color for block at position ${JSON.stringify(block.position)}`);
            }
            updatedCount++;
          } catch (error) {
            console.error(`Failed to create material for block at position ${JSON.stringify(block.position)}:`, error);
          }
        }
      }
      
      // Ensure the mesh has the correct userData
      block.mesh.userData.block = block;
      block.mesh.userData.isBlock = true;
      block.mesh.userData.type = block.type;
      block.mesh.userData.gridPosition = { ...block.position };
      
      updatedCount++;
    }
    
    // Force update the world matrix to ensure correct positioning
    this.ship.group.updateMatrixWorld(true);
    
    // Make sure the ship group is visible
    this.ship.group.visible = true;
    
    console.log(`Updated ${updatedCount} block meshes`);
    return updatedCount;
  }

  /**
   * Fix texture issues with blocks
   * This method specifically targets known issues like blocks above the steering wheel
   * turning gray
   * @returns {Number} - The number of fixed textures
   */
  fixBlockTextureIssues() {
    console.log("Fixing block texture issues...");
    
    let fixedCount = 0;
    
    // Find the steering wheel block
    const steeringWheel = this.ship.blockManager.blocks.find(block => block.type === 'control');
    
    if (steeringWheel) {
      console.log("Found steering wheel at position:", steeringWheel.position);
      
      // Check blocks above the steering wheel
      const blocksAboveSteeringWheel = this.ship.blockManager.blocks.filter(block => 
        block.position.x === steeringWheel.position.x &&
        block.position.z === steeringWheel.position.z &&
        block.position.y > steeringWheel.position.y
      );
      
      console.log(`Found ${blocksAboveSteeringWheel.length} blocks above the steering wheel`);
      
      // Fix textures for these blocks
      for (const block of blocksAboveSteeringWheel) {
        if (!block.mesh) continue;
        
        console.log(`Checking block of type ${block.type} at position:`, block.position);
        
        // Check if the material is missing or incorrect
        const hasMissingTexture = !block.mesh.material || 
                                 !block.mesh.material.map ||
                                 (block.mesh.material.color && block.mesh.material.color.getHex() === 0xAAAAAA);
        
        if (hasMissingTexture) {
          console.log(`Block at position ${JSON.stringify(block.position)} has texture issues, fixing...`);
          
          // Try to create a new material with the correct texture
          if (window.resourceLoader) {
            try {
              const texture = window.resourceLoader.get(block.type);
              if (texture) {
                // Dispose of old material if it exists
                if (block.mesh.material) {
                  block.mesh.material.dispose();
                }
                
                // Create new material with texture
                block.mesh.material = new THREE.MeshStandardMaterial({ 
                  map: texture,
                  roughness: 0.7,
                  metalness: 0.2
                });
                console.log(`Fixed texture for block at position ${JSON.stringify(block.position)}`);
                fixedCount++;
              } else {
                // Use default color if texture loading failed
                const color = block.getDefaultColor ? block.getDefaultColor() : this.getDefaultColorForType(block.type);
                
                // Dispose of old material if it exists
                if (block.mesh.material) {
                  block.mesh.material.dispose();
                }
                
                // Create new material with default color
                block.mesh.material = new THREE.MeshStandardMaterial({ 
                  color: color,
                  roughness: 0.7,
                  metalness: 0.2
                });
                console.log(`Created material with default color for block at position ${JSON.stringify(block.position)}`);
                fixedCount++;
              }
            } catch (error) {
              console.error(`Failed to fix texture for block at position ${JSON.stringify(block.position)}:`, error);
            }
          }
        }
      }
    }
    
    // Also check for any blocks with missing or incorrect textures
    for (const block of this.ship.blockManager.blocks) {
      if (!block.mesh) continue;
      
      // Skip blocks we've already checked (above the steering wheel)
      if (steeringWheel && 
          block.position.x === steeringWheel.position.x &&
          block.position.z === steeringWheel.position.z &&
          block.position.y > steeringWheel.position.y) {
        continue;
      }
      
      // Check if the material is missing or incorrect
      const hasMissingTexture = !block.mesh.material || 
                               !block.mesh.material.map ||
                               (block.mesh.material.color && block.mesh.material.color.getHex() === 0xAAAAAA);
      
      if (hasMissingTexture) {
        console.log(`Block of type ${block.type} at position ${JSON.stringify(block.position)} has texture issues, fixing...`);
        
        // Try to create a new material with the correct texture
        if (window.resourceLoader) {
          try {
            const texture = window.resourceLoader.get(block.type);
            if (texture) {
              // Dispose of old material if it exists
              if (block.mesh.material) {
                block.mesh.material.dispose();
              }
              
              // Create new material with texture
              block.mesh.material = new THREE.MeshStandardMaterial({ 
                map: texture,
                roughness: 0.7,
                metalness: 0.2
              });
              console.log(`Fixed texture for block at position ${JSON.stringify(block.position)}`);
              fixedCount++;
            } else {
              // Use default color if texture loading failed
              const color = block.getDefaultColor ? block.getDefaultColor() : this.getDefaultColorForType(block.type);
              
              // Dispose of old material if it exists
              if (block.mesh.material) {
                block.mesh.material.dispose();
              }
              
              // Create new material with default color
              block.mesh.material = new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.7,
                metalness: 0.2
              });
              console.log(`Created material with default color for block at position ${JSON.stringify(block.position)}`);
              fixedCount++;
            }
          } catch (error) {
            console.error(`Failed to fix texture for block at position ${JSON.stringify(block.position)}:`, error);
          }
        }
      }
    }
    
    console.log(`Fixed textures for ${fixedCount} blocks`);
    return fixedCount;
  }

  /**
   * Get default color for a block type
   * @param {String} type - The block type
   * @returns {Number} - The color as a hex value
   */
  getDefaultColorForType(type) {
    switch (type.toLowerCase()) {
      case 'wood': return 0x8B4513;
      case 'stone': return 0x808080;
      case 'lift': return 0xFFD700;
      case 'cannon': return 0x696969;
      case 'control': return 0x8B0000;
      default: return 0xAAAAAA;
    }
  }
}

export default ShipRenderer; 