/**
 * Unit tests for ship physics
 */

import { updateShipPhysics, applyForce, applyTorque } from '../../../src/physics/shipPhysics.js';
import * as THREE from 'three';

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
      applyAxisAngle: jest.fn()
    }))
  };
});

// Mock the mathUtils functions
jest.mock('../../../src/utils/mathUtils.js', () => ({
  clamp: jest.fn(val => val),
}));

describe('Ship Physics', () => {
  let mockShip;
  let mockWorldManager;
  
  beforeEach(() => {
    // Create a mock ship
    mockShip = {
      blocks: [
        { 
          type: 'wood',
          position: { x: 0, y: 0, z: 0 }
        },
        { 
          type: 'wood',
          position: { x: 1, y: 0, z: 0 }
        },
        { 
          type: 'lift',
          position: { x: 0, y: 1, z: 0 }
        },
        { 
          type: 'engine',
          position: { x: 0, y: 0, z: 1 }
        }
      ],
      position: { x: 0, y: 100, z: 0 },
      rotation: 0,
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: 0,
      isSinking: false,
      controls: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false
      }
    };
    
    // Create a mock world manager
    mockWorldManager = {
      getBlock: jest.fn().mockReturnValue(null)
    };
  });
  
  test('Forward control should move ship in positive Z direction', () => {
    // Set forward control
    mockShip.controls.forward = true;
    
    // Update physics with correct parameter order
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    
    // Check that velocity has increased in positive Z direction
    expect(mockShip.velocity.z).toBeGreaterThan(0);
  });
  
  test('Backward control should move ship in negative Z direction', () => {
    // Set backward control
    mockShip.controls.backward = true;
    
    // Update physics with correct parameter order
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    
    // Expect negative Z velocity
    expect(mockShip.velocity.z).toBeLessThan(0);
  });
  
  test('Left control should apply negative angular velocity', () => {
    // Set left control
    mockShip.controls.left = true;
    
    // Update physics with correct parameter order
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    
    // Expect negative angular velocity
    expect(mockShip.angularVelocity).toBeLessThan(0);
  });
  
  test('Right control should apply positive angular velocity', () => {
    // Set right control
    mockShip.controls.right = true;
    
    // Update physics with correct parameter order
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    
    // Expect positive angular velocity
    expect(mockShip.angularVelocity).toBeGreaterThan(0);
  });
  
  test('Up control should move ship upward', () => {
    // Set up control
    mockShip.controls.up = true;
    
    // Update physics with correct parameter order
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    
    // Expect positive Y velocity
    expect(mockShip.velocity.y).toBeGreaterThan(0);
  });
  
  test('Down control should move ship downward', () => {
    // Set down control
    mockShip.controls.down = true;
    
    // Update physics with correct parameter order
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    
    // Expect negative Y velocity
    expect(mockShip.velocity.y).toBeLessThan(0);
  });
  
  test('Ship should be neutrally buoyant with sufficient lift blocks', () => {
    // Add more lift blocks to ensure the ratio is above the threshold
    mockShip.blocks.push({ type: 'lift', position: { x: 1, y: 1, z: 0 } });
    mockShip.blocks.push({ type: 'lift', position: { x: 2, y: 1, z: 0 } });
    
    // Update physics with correct parameter order
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    
    // Expect ship to not be sinking
    expect(mockShip.isSinking).toBe(false);
  });
  
  test('Ship should sink with insufficient lift blocks', () => {
    // Remove lift blocks to ensure the ratio is below the threshold
    mockShip.blocks = mockShip.blocks.filter(block => block.type !== 'lift');
    
    // Update physics with correct parameter order
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    
    // Expect ship to be sinking
    expect(mockShip.isSinking).toBe(true);
  });
}); 