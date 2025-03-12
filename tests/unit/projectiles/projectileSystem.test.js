/**
 * Unit tests for the Projectile System
 */

import { createProjectileSystem } from '../../../src/weapons/projectileSystem.js';

// Mock Three.js
jest.mock('three', () => {
  return {
    Vector3: jest.fn().mockImplementation(() => ({
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn(),
      add: jest.fn(),
      sub: jest.fn(),
      multiplyScalar: jest.fn(),
      clone: jest.fn().mockReturnThis(),
      normalize: jest.fn().mockReturnThis(),
      length: jest.fn().mockReturnValue(1)
    })),
    BoxGeometry: jest.fn(),
    MeshBasicMaterial: jest.fn(),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    })),
    Group: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      children: []
    }))
  };
});

describe('ProjectileSystem', () => {
  let projectileSystem;
  let mockScene;
  let mockWorld;
  let mockExplosionSystem;
  let deltaTime;
  
  beforeEach(() => {
    // Create mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };
    
    // Create mock world
    mockWorld = {
      getBlockAt: jest.fn().mockReturnValue(null),
      removeBlock: jest.fn(),
      getShipAt: jest.fn().mockReturnValue(null)
    };
    
    // Create mock explosion system
    mockExplosionSystem = {
      createExplosion: jest.fn()
    };
    
    // Create projectile system
    projectileSystem = createProjectileSystem(mockScene, mockWorld, mockExplosionSystem);
    
    // Set delta time (in seconds)
    deltaTime = 0.016; // ~60 FPS
  });
  
  test('should initialize with empty projectiles array', () => {
    expect(projectileSystem.projectiles).toEqual([]);
  });
  
  test('should create a projectile', () => {
    // Create a projectile
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    const type = 'cannonball';
    const owner = 'player1';
    
    projectileSystem.createProjectile(position, velocity, type, owner);
    
    // Check that a projectile was added to the array
    expect(projectileSystem.projectiles.length).toBe(1);
    
    // Check that the projectile has the correct properties
    const projectile = projectileSystem.projectiles[0];
    expect(projectile.position).toEqual(position);
    expect(projectile.velocity).toEqual(velocity);
    expect(projectile.type).toBe(type);
    expect(projectile.owner).toBe(owner);
    expect(projectile.timeToLive).toBeGreaterThan(0);
    
    // Check that a mesh was created and added to the scene
    expect(projectile.mesh).toBeDefined();
    expect(mockScene.add).toHaveBeenCalledWith(projectile.mesh);
  });
  
  test('should update projectile positions', () => {
    // Create a projectile
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    
    projectileSystem.createProjectile(position, velocity, 'cannonball', 'player1');
    
    // Update projectiles
    projectileSystem.update(deltaTime);
    
    // Check that the projectile position was updated
    const projectile = projectileSystem.projectiles[0];
    expect(projectile.position.x).toBeGreaterThan(0);
  });
  
  test('should apply gravity to projectiles', () => {
    // Create a projectile
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    
    projectileSystem.createProjectile(position, velocity, 'cannonball', 'player1');
    
    // Update projectiles
    projectileSystem.update(deltaTime);
    
    // Check that gravity was applied (velocity.y should be negative)
    const projectile = projectileSystem.projectiles[0];
    expect(projectile.velocity.y).toBeLessThan(0);
  });
  
  test('should remove projectiles when they hit a block', () => {
    // Create a projectile
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    
    projectileSystem.createProjectile(position, velocity, 'cannonball', 'player1');
    
    // Mock world.getBlockAt to return a block
    mockWorld.getBlockAt.mockReturnValue({ type: 'wood' });
    
    // Update projectiles
    projectileSystem.update(deltaTime);
    
    // Check that the projectile was removed
    expect(projectileSystem.projectiles.length).toBe(0);
    
    // Check that an explosion was created
    expect(mockExplosionSystem.createExplosion).toHaveBeenCalled();
  });
  
  test('should remove projectiles when they hit a ship', () => {
    // Create a projectile
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    
    projectileSystem.createProjectile(position, velocity, 'cannonball', 'player1');
    
    // Mock world.getShipAt to return a ship
    const mockShip = {
      id: 'ship1',
      owner: 'player2',
      applyDamage: jest.fn()
    };
    mockWorld.getShipAt.mockReturnValue(mockShip);
    
    // Update projectiles
    projectileSystem.update(deltaTime);
    
    // Check that the projectile was removed
    expect(projectileSystem.projectiles.length).toBe(0);
    
    // Check that damage was applied to the ship
    expect(mockShip.applyDamage).toHaveBeenCalled();
    
    // Check that an explosion was created
    expect(mockExplosionSystem.createExplosion).toHaveBeenCalled();
  });
  
  test('should remove projectiles when their time to live expires', () => {
    // Create a projectile with a very short time to live
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    
    projectileSystem.createProjectile(position, velocity, 'cannonball', 'player1');
    
    // Set time to live to a very small value
    projectileSystem.projectiles[0].timeToLive = 0.01;
    
    // Update projectiles with a larger delta time
    projectileSystem.update(0.02);
    
    // Check that the projectile was removed
    expect(projectileSystem.projectiles.length).toBe(0);
  });
  
  test('should not damage ships owned by the projectile owner', () => {
    // Create a projectile
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    const owner = 'player1';
    
    projectileSystem.createProjectile(position, velocity, 'cannonball', owner);
    
    // Mock world.getShipAt to return a ship owned by the same player
    const mockShip = {
      id: 'ship1',
      owner: owner,
      applyDamage: jest.fn()
    };
    mockWorld.getShipAt.mockReturnValue(mockShip);
    
    // Update projectiles
    projectileSystem.update(deltaTime);
    
    // Check that damage was not applied to the ship
    expect(mockShip.applyDamage).not.toHaveBeenCalled();
    
    // Check that the projectile was not removed (it passed through)
    expect(projectileSystem.projectiles.length).toBe(1);
  });
  
  test('should create TNT projectiles with a fuse', () => {
    // Create a TNT projectile
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    
    projectileSystem.createProjectile(position, velocity, 'tnt', 'player1');
    
    // Check that the projectile has a fuse property
    const projectile = projectileSystem.projectiles[0];
    expect(projectile.fuse).toBeDefined();
    expect(projectile.fuse).toBeGreaterThan(0);
  });
  
  test('should detonate TNT projectiles when their fuse expires', () => {
    // Create a TNT projectile
    const position = { x: 0, y: 100, z: 0 };
    const velocity = { x: 10, y: 0, z: 0 };
    
    projectileSystem.createProjectile(position, velocity, 'tnt', 'player1');
    
    // Set fuse to a very small value
    projectileSystem.projectiles[0].fuse = 0.01;
    
    // Update projectiles with a larger delta time
    projectileSystem.update(0.02);
    
    // Check that the projectile was removed
    expect(projectileSystem.projectiles.length).toBe(0);
    
    // Check that an explosion was created
    expect(mockExplosionSystem.createExplosion).toHaveBeenCalled();
  });
}); 