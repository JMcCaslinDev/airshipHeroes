/**
 * Unit tests for ship mode controller
 */

import { createShipModeController } from '../../../src/modes/shipMode.js';
import * as THREE from 'three';

// Mock Three.js
jest.mock('three', () => {
  return {
    Vector3: jest.fn().mockImplementation(() => ({
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn(),
      add: jest.fn().mockReturnThis(),
      sub: jest.fn().mockReturnThis(),
      multiplyScalar: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      normalize: jest.fn().mockReturnThis(),
      applyAxisAngle: jest.fn().mockReturnThis()
    })),
    Quaternion: jest.fn().mockImplementation(() => ({
      setFromAxisAngle: jest.fn()
    })),
    Euler: jest.fn().mockImplementation(() => ({
      set: jest.fn()
    }))
  };
});

describe('Ship Mode Controller', () => {
  let controller;
  let mockPlayer;
  let mockCamera;
  let mockWorld;
  
  beforeEach(() => {
    // Create mock player
    mockPlayer = {
      mode: 'ship',
      ship: {
        position: { 
          x: 0, 
          y: 100, 
          z: 0,
          clone: jest.fn().mockReturnValue({ 
            x: 0, 
            y: 100, 
            z: 0,
            add: jest.fn().mockReturnThis() 
          })
        },
        rotation: 0,
        controls: {
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: false,
          down: false
        }
      }
    };
    
    // Create mock camera with proper position object
    mockCamera = {
      position: { 
        x: 0, 
        y: 0, 
        z: 0,
        copy: jest.fn().mockReturnThis(),
        add: jest.fn().mockReturnThis(),
        set: jest.fn()
      },
      lookAt: jest.fn()
    };
    
    // Create mock world
    mockWorld = {};
    
    // Create controller
    controller = createShipModeController(mockPlayer, mockCamera, mockWorld);
    controller.activate();
  });
  
  test('handleInput should set ship controls correctly for W key (forward)', () => {
    // Create mock keys object with W key pressed
    const keys = {
      forward: true,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that forward control is set
    expect(mockPlayer.ship.controls.forward).toBe(true);
    expect(mockPlayer.ship.controls.backward).toBe(false);
  });
  
  test('handleInput should set ship controls correctly for S key (backward)', () => {
    // Create mock keys object with S key pressed
    const keys = {
      forward: false,
      backward: true,
      left: false,
      right: false,
      up: false,
      down: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that backward control is set
    expect(mockPlayer.ship.controls.forward).toBe(false);
    expect(mockPlayer.ship.controls.backward).toBe(true);
  });
  
  test('handleInput should set ship controls correctly for A key (left)', () => {
    // Create mock keys object with A key pressed
    const keys = {
      forward: false,
      backward: false,
      left: true,
      right: false,
      up: false,
      down: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that left control is set
    expect(mockPlayer.ship.controls.left).toBe(true);
    expect(mockPlayer.ship.controls.right).toBe(false);
  });
  
  test('handleInput should set ship controls correctly for D key (right)', () => {
    // Create mock keys object with D key pressed
    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: true,
      up: false,
      down: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that right control is set
    expect(mockPlayer.ship.controls.left).toBe(false);
    expect(mockPlayer.ship.controls.right).toBe(true);
  });
  
  test('handleInput should set ship controls correctly for Q key (up)', () => {
    // Create mock keys object with Q key pressed
    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: true,
      down: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that up control is set
    expect(mockPlayer.ship.controls.up).toBe(true);
    expect(mockPlayer.ship.controls.down).toBe(false);
  });
  
  test('handleInput should set ship controls correctly for E key (down)', () => {
    // Create mock keys object with E key pressed
    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: true
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that down control is set
    expect(mockPlayer.ship.controls.up).toBe(false);
    expect(mockPlayer.ship.controls.down).toBe(true);
  });
  
  test('activate should set player mode to ship', () => {
    // Set player mode to something else
    mockPlayer.mode = 'player';
    
    // Activate ship mode
    controller.activate();
    
    // Check that player mode is set to ship
    expect(mockPlayer.mode).toBe('ship');
  });
  
  test('deactivate should reset ship controls', () => {
    // Set some controls
    mockPlayer.ship.controls.forward = true;
    mockPlayer.ship.controls.left = true;
    
    // Deactivate ship mode
    controller.deactivate();
    
    // Check that controls are reset
    expect(mockPlayer.ship.controls.forward).toBe(false);
    expect(mockPlayer.ship.controls.backward).toBe(false);
    expect(mockPlayer.ship.controls.left).toBe(false);
    expect(mockPlayer.ship.controls.right).toBe(false);
    expect(mockPlayer.ship.controls.up).toBe(false);
    expect(mockPlayer.ship.controls.down).toBe(false);
  });
}); 