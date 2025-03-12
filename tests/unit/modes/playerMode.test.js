/**
 * Unit tests for player mode controller
 */

import { createPlayerModeController } from '../../../src/modes/playerMode.js';
import * as THREE from 'three';

// Mock Three.js
jest.mock('three', () => {
  const mockVector3 = {
    set: jest.fn(),
    clone: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
    applyAxisAngle: jest.fn().mockReturnThis(),
    applyEuler: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    multiplyScalar: jest.fn().mockReturnThis(),
    subVectors: jest.fn().mockReturnThis(),
    length: 1,
    x: 0,
    y: 0,
    z: 0
  };
  
  const mockBox3 = {
    setFromObject: jest.fn().mockReturnThis(),
    setFromCenterAndSize: jest.fn().mockReturnThis(),
    intersectsBox: jest.fn().mockReturnValue(false)
  };
  
  const mockRaycaster = {
    set: jest.fn(),
    intersectObjects: jest.fn().mockReturnValue([])
  };
  
  const mockMesh = {
    position: { 
      x: 0, 
      y: 0, 
      z: 0,
      set: jest.fn() 
    },
    rotation: { x: 0, y: 0, z: 0 },
    visible: false
  };
  
  const mockGroup = {
    add: jest.fn(),
    children: [],
    visible: false
  };
  
  return {
    Vector3: jest.fn().mockImplementation(() => ({ ...mockVector3 })),
    Box3: jest.fn().mockImplementation(() => ({ ...mockBox3 })),
    Raycaster: jest.fn().mockImplementation(() => ({ ...mockRaycaster })),
    Mesh: jest.fn().mockImplementation(() => ({ ...mockMesh })),
    Group: jest.fn().mockImplementation(() => ({ ...mockGroup })),
    Euler: jest.fn().mockImplementation(() => ({
      set: jest.fn()
    })),
    MeshBasicMaterial: jest.fn(),
    BoxGeometry: jest.fn()
  };
});

describe('Player Mode Controller', () => {
  let controller;
  let mockPlayer;
  let mockCamera;
  let mockWorld;
  
  beforeEach(() => {
    // Mock document.body.requestPointerLock
    document.body.requestPointerLock = jest.fn();
    document.exitPointerLock = jest.fn();
    document.pointerLockElement = null;
    
    // Create mock player
    mockPlayer = {
      mode: 'player',
      character: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        onGround: true,
        height: 1.8,
        width: 0.6,
        speed: 5,
        jumpForce: 10,
        gravity: 20,
        mesh: {
          position: { 
            x: 0, 
            y: 0, 
            z: 0,
            set: jest.fn() 
          },
          rotation: { x: 0, y: 0, z: 0 }
        },
        move: jest.fn(),
        jump: jest.fn(),
        sneak: jest.fn(),
        stopSneak: jest.fn()
      },
      ship: {
        position: { x: 0, y: 0, z: 0 },
        steeringWheel: {
          position: { x: 0, y: 0, z: 0 }
        },
        blocks: [],
        group: {
          children: [],
          add: jest.fn(),
          remove: jest.fn()
        }
      },
      inventory: {
        selectedSlot: 0,
        slots: Array(9).fill(null)
      }
    };
    
    // Create mock camera
    mockCamera = {
      position: { 
        x: 0, 
        y: 0, 
        z: 0,
        set: jest.fn() 
      },
      rotation: { 
        x: 0, 
        y: 0, 
        z: 0,
        set: jest.fn() 
      },
      lookAt: jest.fn()
    };
    
    // Create mock world
    mockWorld = {
      getBlock: jest.fn().mockReturnValue(null),
      setBlock: jest.fn(),
      removeBlock: jest.fn()
    };
    
    // Create controller
    controller = createPlayerModeController(mockPlayer, mockCamera, mockWorld);
    controller.activate();
  });
  
  test('should initialize with correct default values', () => {
    expect(controller.active).toBe(true);
    expect(controller.player).toBe(mockPlayer);
    expect(controller.camera).toBe(mockCamera);
    expect(controller.cameraRotation).toEqual({ x: 0, y: 0 });
  });
  
  test('should activate player mode', () => {
    expect(controller.active).toBe(true);
    expect(mockPlayer.mode).toBe('player');
    expect(mockPlayer.character.mesh.visible).toBe(true);
    expect(document.body.requestPointerLock).toHaveBeenCalled();
  });
  
  test('should deactivate player mode', () => {
    // First activate
    controller.activate();
    
    // Then deactivate
    controller.deactivate();
    
    expect(controller.active).toBe(false);
    expect(document.exitPointerLock).toHaveBeenCalled();
  });
  
  test('handleInput should call character.move with correct direction for W key (forward)', () => {
    // Create mock keys object with W key pressed
    const keys = {
      w: true,
      s: false,
      a: false,
      d: false,
      space: false,
      x: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that move was called with forward direction
    expect(mockPlayer.character.move).toHaveBeenCalledWith(expect.objectContaining({
      z: expect.any(Number)
    }));
    
    // Get the direction argument
    const moveArg = mockPlayer.character.move.mock.calls[0][0];
    
    // Check that z component is negative (forward in player space)
    expect(moveArg.z).toBeLessThan(0);
  });
  
  test('handleInput should call character.move with correct direction for S key (backward)', () => {
    // Create mock keys object with S key pressed
    const keys = {
      w: false,
      s: true,
      a: false,
      d: false,
      space: false,
      x: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that move was called with backward direction
    expect(mockPlayer.character.move).toHaveBeenCalledWith(expect.objectContaining({
      z: expect.any(Number)
    }));
    
    // Get the direction argument
    const moveArg = mockPlayer.character.move.mock.calls[0][0];
    
    // Check that z component is positive (backward in player space)
    expect(moveArg.z).toBeGreaterThan(0);
  });
  
  test('handleInput should call character.move with correct direction for A key (left)', () => {
    // Create mock keys object with A key pressed
    const keys = {
      w: false,
      s: false,
      a: true,
      d: false,
      space: false,
      x: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that move was called with left direction
    expect(mockPlayer.character.move).toHaveBeenCalledWith(expect.objectContaining({
      x: expect.any(Number)
    }));
    
    // Get the direction argument
    const moveArg = mockPlayer.character.move.mock.calls[0][0];
    
    // Check that x component is negative (left in player space)
    expect(moveArg.x).toBeLessThan(0);
  });
  
  test('handleInput should call character.move with correct direction for D key (right)', () => {
    // Create mock keys object with D key pressed
    const keys = {
      w: false,
      s: false,
      a: false,
      d: true,
      space: false,
      x: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that move was called with right direction
    expect(mockPlayer.character.move).toHaveBeenCalledWith(expect.objectContaining({
      x: expect.any(Number)
    }));
    
    // Get the direction argument
    const moveArg = mockPlayer.character.move.mock.calls[0][0];
    
    // Check that x component is positive (right in player space)
    expect(moveArg.x).toBeGreaterThan(0);
  });
  
  test('handleInput should call character.jump when Space key is pressed', () => {
    // Create mock keys object with Space key pressed
    const keys = {
      w: false,
      s: false,
      a: false,
      d: false,
      space: true,
      x: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that jump was called
    expect(mockPlayer.character.jump).toHaveBeenCalled();
  });
  
  test('handleInput should call character.sneak when X key is pressed', () => {
    // Create mock keys object with X key pressed
    const keys = {
      w: false,
      s: false,
      a: false,
      d: false,
      space: false,
      x: true
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that sneak was called
    expect(mockPlayer.character.sneak).toHaveBeenCalled();
  });
  
  test('handleInput should call character.stopSneak when X key is released', () => {
    // Set character to sneaking
    mockPlayer.character.isSneaking = true;
    
    // Create mock keys object with X key not pressed
    const keys = {
      w: false,
      s: false,
      a: false,
      d: false,
      space: false,
      x: false
    };
    
    // Handle input
    controller.handleInput(keys);
    
    // Check that stopSneak was called
    expect(mockPlayer.character.stopSneak).toHaveBeenCalled();
  });
  
  test('activate should set player mode to player', () => {
    // Set player mode to something else
    mockPlayer.mode = 'ship';
    
    // Activate player mode
    controller.activate();
    
    // Check that player mode is set to player
    expect(mockPlayer.mode).toBe('player');
  });
  
  test('should handle mouse movement', () => {
    // Initial rotation
    const initialRotation = { ...controller.cameraRotation };
    
    // Handle mouse movement
    controller.handleMouseMove(100, 50);
    
    // Check that rotation was updated
    expect(controller.cameraRotation.x).not.toEqual(initialRotation.x);
    expect(controller.cameraRotation.y).not.toEqual(initialRotation.y);
    expect(mockPlayer.character.rotation).toEqual(controller.cameraRotation.y);
  });
  
  test('should update camera position', () => {
    // Set character position
    mockPlayer.character.position.x = 10;
    mockPlayer.character.position.y = 5;
    mockPlayer.character.position.z = 15;
    
    // Update camera
    controller.updateCamera();
    
    // Check camera position
    expect(mockCamera.position.x).toBe(10);
    expect(mockCamera.position.y).toBeGreaterThan(5); // Should be at eye level
    expect(mockCamera.position.z).toBe(15);
  });
  
  test('should not update camera if inactive', () => {
    // Deactivate controller
    controller.deactivate();
    
    // Set initial camera position
    mockCamera.position.x = 10;
    mockCamera.position.y = 10;
    mockCamera.position.z = 10;
    
    // Update controller
    controller.update(0.1);
    
    // Check camera position (should not be updated)
    expect(mockCamera.position.x).toBe(10);
    expect(mockCamera.position.y).toBe(10);
    expect(mockCamera.position.z).toBe(10);
  });
  
  test('should handle mouse down events', () => {
    // Create a mock intersection
    const mockIntersection = {
      distance: 2,
      point: new THREE.Vector3(1, 1, 1),
      object: { userData: { blockType: 'wood' } }
    };
    
    // Set up the raycaster mock to return our intersection
    const mockRaycaster = new THREE.Raycaster();
    mockRaycaster.intersectObjects.mockReturnValue([mockIntersection]);
    
    // Replace the controller's raycaster with our mock
    controller.raycaster = mockRaycaster;
    
    // Mock the mouse event
    const mockEvent = {
      button: 0, // Left click
      clientX: 400,
      clientY: 300
    };
    
    // Call the mouse down handler
    controller.handleMouseDown(mockEvent);
    
    // Verify that the world.setBlock method was called
    expect(mockWorld.setBlock).toHaveBeenCalled();
  });
  
  test('should update player position and handle collisions', () => {
    // Set initial position and velocity
    mockPlayer.character.position.x = 0;
    mockPlayer.character.position.y = 10;
    mockPlayer.character.position.z = 0;
    mockPlayer.character.velocity.x = 1;
    mockPlayer.character.velocity.y = -1;
    mockPlayer.character.velocity.z = 1;
    
    // Update controller
    controller.update(1); // 1 second delta time
    
    // Check that position was updated
    expect(mockPlayer.character.position.x).toBe(1);
    expect(mockPlayer.character.position.y).toBeLessThan(10); // Gravity should have been applied
    expect(mockPlayer.character.position.z).toBe(1);
    
    // Check that character mesh position was updated
    expect(mockPlayer.character.mesh.position.set).toHaveBeenCalled();
  });
}); 