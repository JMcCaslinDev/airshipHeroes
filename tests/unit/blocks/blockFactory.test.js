/**
 * BlockFactory Tests
 * 
 * Tests for the BlockFactory class that creates blocks for ships.
 */

import * as THREE from 'three';
import BlockFactory from '../../../src/blocks/blockFactory.js';

// Mock THREE.js objects
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  
  // Create mock classes
  class MockMesh {
    constructor() {
      this.position = { set: jest.fn() };
      this.castShadow = false;
      this.receiveShadow = false;
      this.userData = {};
    }
  }
  
  class MockBoxGeometry {
    constructor() {}
  }
  
  class MockMeshStandardMaterial {
    constructor() {}
  }
  
  class MockGroup {
    constructor() {
      this.children = [];
    }
    
    add(object) {
      this.children.push(object);
    }
  }
  
  return {
    ...actualThree,
    Mesh: MockMesh,
    BoxGeometry: MockBoxGeometry,
    MeshStandardMaterial: MockMeshStandardMaterial,
    Group: MockGroup
  };
});

describe('BlockFactory', () => {
  // Mock texture loader
  const mockTextureLoader = {
    get: jest.fn().mockImplementation((type) => {
      if (type === 'missing') {
        throw new Error('Texture not found');
      }
      return { isTexture: true };
    })
  };
  
  describe('createBlock', () => {
    test('should create a block with the specified type and position', () => {
      // Arrange
      const type = 'wood';
      const position = { x: 1, y: 2, z: 3 };
      
      // Act
      const block = BlockFactory.createBlock(type, position);
      
      // Assert
      expect(block).toBeDefined();
      expect(block.type).toBe(type);
      expect(block.position).toEqual(position);
      expect(block.health).toBe(100);
      expect(block.mesh).toBeNull();
    });
    
    test('should normalize block type to lowercase', () => {
      // Arrange
      const type = 'WOOD';
      const position = { x: 1, y: 2, z: 3 };
      
      // Act
      const block = BlockFactory.createBlock(type, position);
      
      // Assert
      expect(block.type).toBe('wood');
    });
    
    test('should create a deep copy of the position object', () => {
      // Arrange
      const type = 'wood';
      const position = { x: 1, y: 2, z: 3 };
      
      // Act
      const block = BlockFactory.createBlock(type, position);
      position.x = 99; // Modify original position
      
      // Assert
      expect(block.position).toEqual({ x: 1, y: 2, z: 3 });
    });
  });
  
  describe('createMesh', () => {
    test('should create a mesh and add it to the group', () => {
      // Arrange
      const type = 'wood';
      const position = { x: 1, y: 2, z: 3 };
      const block = BlockFactory.createBlock(type, position);
      const group = new THREE.Group();
      
      // Act
      block.createMesh(group, mockTextureLoader);
      
      // Assert
      expect(block.mesh).toBeDefined();
      expect(block.mesh.position.set).toHaveBeenCalledWith(1, 2, 3);
      expect(block.mesh.castShadow).toBe(true);
      expect(block.mesh.receiveShadow).toBe(true);
      expect(group.children.length).toBe(1);
      expect(group.children[0]).toBe(block.mesh);
    });
    
    test('should set userData properties on the mesh', () => {
      // Arrange
      const type = 'wood';
      const position = { x: 1, y: 2, z: 3 };
      const block = BlockFactory.createBlock(type, position);
      const group = new THREE.Group();
      
      // Act
      block.createMesh(group, mockTextureLoader);
      
      // Assert
      expect(block.mesh.userData.block).toBe(block);
      expect(block.mesh.userData.isBlock).toBe(true);
    });
    
    test('should handle missing textures gracefully', () => {
      // Arrange
      const type = 'missing';
      const position = { x: 1, y: 2, z: 3 };
      const block = BlockFactory.createBlock(type, position);
      const group = new THREE.Group();
      
      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      // Act
      block.createMesh(group, mockTextureLoader);
      
      // Assert
      expect(block.mesh).toBeDefined();
      expect(console.error).toHaveBeenCalled();
      
      // Restore console.error
      console.error = originalConsoleError;
    });
  });
  
  describe('getDefaultColor', () => {
    test('should return the correct color for each block type', () => {
      // Test each block type
      const blockTypes = ['wood', 'stone', 'lift', 'cannon', 'control'];
      const expectedColors = [0xBC986A, 0x7F7F7F, 0xE9ECEC, 0x7F7F7F, 0x6B4423];
      
      blockTypes.forEach((type, index) => {
        const block = BlockFactory.createBlock(type, { x: 0, y: 0, z: 0 });
        expect(block.getDefaultColor()).toBe(expectedColors[index]);
      });
    });
    
    test('should return a default color for unknown block types', () => {
      const block = BlockFactory.createBlock('unknown', { x: 0, y: 0, z: 0 });
      expect(block.getDefaultColor()).toBe(0xAAAAAA);
    });
  });
  
  describe('createBlocksFromShipDefinition', () => {
    test('should create blocks from a ship definition', () => {
      // Arrange
      const shipDefinition = {
        blocks: [
          { type: 'wood', position: { x: 1, y: 2, z: 3 } },
          { type: 'stone', position: { x: 4, y: 5, z: 6 } }
        ]
      };
      
      // Act
      const blocks = BlockFactory.createBlocksFromShipDefinition(shipDefinition);
      
      // Assert
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe('wood');
      expect(blocks[0].position).toEqual({ x: 1, y: 2, z: 3 });
      expect(blocks[1].type).toBe('stone');
      expect(blocks[1].position).toEqual({ x: 4, y: 5, z: 6 });
    });
    
    test('should handle both position formats', () => {
      // Arrange
      const shipDefinition = {
        blocks: [
          { type: 'wood', position: { x: 1, y: 2, z: 3 } }, // Nested position object
          { type: 'stone', x: 4, y: 5, z: 6 } // Flat position properties
        ]
      };
      
      // Act
      const blocks = BlockFactory.createBlocksFromShipDefinition(shipDefinition);
      
      // Assert
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe('wood');
      expect(blocks[0].position).toEqual({ x: 1, y: 2, z: 3 });
      expect(blocks[1].type).toBe('stone');
      expect(blocks[1].position).toEqual({ x: 4, y: 5, z: 6 });
    });
    
    test('should handle invalid ship definitions', () => {
      // Test with null
      expect(BlockFactory.createBlocksFromShipDefinition(null)).toEqual([]);
      
      // Test with missing blocks array
      expect(BlockFactory.createBlocksFromShipDefinition({})).toEqual([]);
      
      // Test with empty blocks array
      expect(BlockFactory.createBlocksFromShipDefinition({ blocks: [] })).toEqual([]);
      
      // Test with invalid block definitions
      const shipDefinition = {
        blocks: [
          { type: 'wood' }, // Missing position
          { position: { x: 1, y: 2, z: 3 } } // Missing type
        ]
      };
      expect(BlockFactory.createBlocksFromShipDefinition(shipDefinition)).toEqual([]);
    });
  });
}); 