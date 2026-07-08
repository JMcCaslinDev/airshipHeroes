/**
 * World Manager Module Tests
 */

import { createWorldManager } from '../../../src/core/worldManager';

// Mock Three.js
jest.mock('three', () => {
  return {
    Group: jest.fn().mockImplementation(() => ({
      name: '',
      add: jest.fn(),
      remove: jest.fn(),
      children: []
    })),
    BoxGeometry: jest.fn(),
    MeshLambertMaterial: jest.fn().mockImplementation(() => ({
      color: 0xFFFFFF
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      castShadow: false,
      receiveShadow: false,
      userData: {},
      geometry: { dispose: jest.fn() }
    })),
    Vector3: jest.fn().mockImplementation(() => ({
      x: 0, y: 0, z: 0
    }))
  };
});

describe('WorldManager', () => {
  let worldManager;
  let mockScene;
  
  beforeEach(() => {
    // Create mock scene
    mockScene = {
      add: jest.fn()
    };
    
    // Create world manager
    worldManager = createWorldManager();
  });
  
  test('should initialize the world manager', () => {
    // Initialize world manager
    worldManager.init(mockScene);
    
    // Check if group was added to scene
    expect(mockScene.add).toHaveBeenCalled();
  });
  
  test('should add a block to the world', () => {
    // Add block
    const position = { x: 1, y: 2, z: 3 };
    const type = 'wood';
    const block = worldManager.addBlock(position, type);
    
    // Check block properties
    expect(block).toBeDefined();
    expect(block.position.set).toHaveBeenCalledWith(position.x, position.y, position.z);
    expect(block.userData.type).toBe(type);
    expect(block.userData.isWorldBlock).toBe(true);
    
    // Check if block was added to group
    expect(worldManager.getGroup().add).toHaveBeenCalledWith(block);
  });
  
  test('should not add duplicate blocks at the same position', () => {
    // Add block
    const position = { x: 1, y: 2, z: 3 };
    const type = 'wood';
    const block1 = worldManager.addBlock(position, type);
    
    // Reset mock
    worldManager.getGroup().add.mockClear();
    
    // Add another block at the same position
    const block2 = worldManager.addBlock(position, type);
    
    // Check if the same block was returned
    expect(block2).toBe(block1);
    
    // Check if block was not added to group again
    expect(worldManager.getGroup().add).not.toHaveBeenCalled();
  });
  
  test('should remove a block from the world', () => {
    // Add block
    const position = { x: 1, y: 2, z: 3 };
    const type = 'wood';
    const block = worldManager.addBlock(position, type);
    
    // Remove block
    worldManager.removeBlock(position);
    
    // Check if block was removed from group
    expect(worldManager.getGroup().remove).toHaveBeenCalledWith(block);
    
    // Check if block geometry was disposed
    expect(block.geometry.dispose).toHaveBeenCalled();
    
    // Check if block was removed from blocks object
    expect(worldManager.getBlock(position)).toBeNull();
  });
  
  test('should get a block at a position', () => {
    // Add block
    const position = { x: 1, y: 2, z: 3 };
    const type = 'wood';
    const block = worldManager.addBlock(position, type);
    
    // Get block
    const retrievedBlock = worldManager.getBlock(position);
    
    // Check if the correct block was returned
    expect(retrievedBlock).toBe(block);
  });
  
  test('should return null when getting a non-existent block', () => {
    // Get non-existent block
    const position = { x: 1, y: 2, z: 3 };
    const retrievedBlock = worldManager.getBlock(position);
    
    // Check if null was returned
    expect(retrievedBlock).toBeNull();
  });
  
  test('should get the correct color for different block types', () => {
    // Check colors for different block types
    expect(worldManager.getBlockColor('wood')).toBe(0xBC986A);
    expect(worldManager.getBlockColor('stone')).toBe(0x7F7F7F);
    expect(worldManager.getBlockColor('metal')).toBe(0xA9A9A9);
    expect(worldManager.getBlockColor('lift')).toBe(0xE9ECEC);
    expect(worldManager.getBlockColor('cannon')).toBe(0x7F7F7F);
    expect(worldManager.getBlockColor('steering')).toBe(0x6B4423);
    expect(worldManager.getBlockColor('unknown')).toBe(0xFFFFFF);
  });
  
  test('should clear all blocks from the world', () => {
    // Add some blocks
    worldManager.addBlock({ x: 1, y: 2, z: 3 }, 'wood');
    worldManager.addBlock({ x: 4, y: 5, z: 6 }, 'stone');
    
    // Mock children array
    const mockMesh1 = { geometry: { dispose: jest.fn() } };
    const mockMesh2 = { geometry: { dispose: jest.fn() } };
    worldManager.getGroup().children = [mockMesh1, mockMesh2];
    
    // Clear blocks
    worldManager.clear();
    
    // Check if all blocks were removed from group
    expect(worldManager.getGroup().remove).toHaveBeenCalledWith(mockMesh1);
    expect(worldManager.getGroup().remove).toHaveBeenCalledWith(mockMesh2);
    
    // Check if all block geometries were disposed
    expect(mockMesh1.geometry.dispose).toHaveBeenCalled();
    expect(mockMesh2.geometry.dispose).toHaveBeenCalled();
    
    // Check if all blocks were removed from blocks object
    expect(Object.keys(worldManager.getAllBlocks()).length).toBe(0);
  });
  
  test('should get all blocks in the world', () => {
    // Add some blocks
    const block1 = worldManager.addBlock({ x: 1, y: 2, z: 3 }, 'wood');
    const block2 = worldManager.addBlock({ x: 4, y: 5, z: 6 }, 'stone');
    
    // Get all blocks
    const allBlocks = worldManager.getAllBlocks();
    
    // Check if all blocks are in the result
    expect(allBlocks['1,2,3']).toBe(block1);
    expect(allBlocks['4,5,6']).toBe(block2);
  });
  
  test('should get the world group', () => {
    // Get group
    const group = worldManager.getGroup();
    
    // Check if group is returned
    expect(group).toBeDefined();
    expect(group.name).toBe('World');
  });
}); 