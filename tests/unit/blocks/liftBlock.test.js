/**
 * Unit tests for the LiftBlock class
 */

import LiftBlock from '../../../src/blocks/liftBlock.js';

// Mock Three.js
jest.mock('three', () => {
  return {
    BoxGeometry: jest.fn(),
    MeshStandardMaterial: jest.fn(),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      userData: {},
      material: { color: { set: jest.fn() } }
    })),
    TextureLoader: jest.fn().mockImplementation(() => ({
      load: jest.fn()
    }))
  };
});

describe('LiftBlock', () => {
  let liftBlock;
  let mockScene;
  
  beforeEach(() => {
    // Create a new LiftBlock instance before each test
    liftBlock = new LiftBlock({ x: 0, y: 0, z: 0 });
    
    // Mock scene object
    mockScene = {
      add: jest.fn()
    };
  });
  
  test('should have correct default properties', () => {
    expect(liftBlock.type).toBe('lift');
    expect(liftBlock.isFlammable).toBe(true);
    expect(liftBlock.health).toBe(1);
    expect(liftBlock.maxHealth).toBe(1);
    expect(liftBlock.position).toEqual({ x: 0, y: 0, z: 0 });
  });
  
  test('should create mesh correctly', () => {
    liftBlock.createMesh(mockScene);
    
    expect(liftBlock.mesh).toBeDefined();
    expect(mockScene.add).toHaveBeenCalledWith(liftBlock.mesh);
  });
  
  test('should take damage correctly', () => {
    const destroyed = liftBlock.takeDamage(0.5);
    
    expect(liftBlock.health).toBe(0.5);
    expect(destroyed).toBe(false);
  });
  
  test('should be destroyed when health reaches 0', () => {
    const destroyed = liftBlock.takeDamage(1);
    
    expect(liftBlock.health).toBeLessThanOrEqual(0);
    expect(liftBlock.isDestroyed).toBe(true);
    expect(destroyed).toBe(true);
  });
  
  test('should catch fire', () => {
    const caughtFire = liftBlock.setOnFire();
    
    expect(liftBlock.isBurning).toBe(true);
    expect(caughtFire).toBe(true);
  });
  
  test('should provide less lift when burning', () => {
    const normalLift = liftBlock.calculateLiftForce(10);
    
    liftBlock.setOnFire();
    const burningLift = liftBlock.calculateLiftForce(10);
    
    expect(burningLift).toBeLessThan(normalLift);
    expect(burningLift).toBe(normalLift * 0.5);
  });
}); 