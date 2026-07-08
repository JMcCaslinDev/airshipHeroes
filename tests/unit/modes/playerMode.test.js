/**
 * Unit tests for player mode controller
 */

import { createPlayerModeController } from '../../../src/modes/playerMode.js';
import * as THREE from 'three';

// Mock Three.js
jest.mock('three', () => {
  const mockVector3 = {
    x: 0,
    y: 0,
    z: 0,
    set: jest.fn(),
    clone: jest.fn().mockReturnThis(),
    normalize: jest.fn(function normalize() {
      const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) || 1;
      this.x /= len;
      this.y /= len;
      this.z /= len;
      return this;
    }),
    applyAxisAngle: jest.fn().mockReturnThis(),
    applyEuler: jest.fn().mockReturnThis(),
    add: jest.fn(function add(v) {
      this.x += v.x || 0;
      this.y += v.y || 0;
      this.z += v.z || 0;
      return this;
    }),
    sub: jest.fn(function sub(v) {
      this.x -= v.x || 0;
      this.y -= v.y || 0;
      this.z -= v.z || 0;
      return this;
    }),
    multiplyScalar: jest.fn(function multiplyScalar(s) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }),
    subVectors: jest.fn().mockReturnThis(),
    length: jest.fn(function length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    })
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
    Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ ...mockVector3, x, y, z })),
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
    global.requestAnimationFrame = (cb) => {
      cb();
      return 0;
    };

    // Mock document.body.requestPointerLock
    document.body.requestPointerLock = jest.fn();
    document.exitPointerLock = jest.fn();
    document.pointerLockElement = null;
    
    // Create mock player
    mockPlayer = {
      mode: 'player',
      cameraRotation: { x: 0, y: 0 },
      character: {
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        velocity: { x: 0, y: 0, z: 0 },
        isJumping: false,
        isSneaking: false,
        isOnGround: true,
        mesh: {
          position: { x: 0, y: 0, z: 0, set: jest.fn() },
          rotation: { x: 0, y: 0, z: 0, y: 0 },
          visible: false
        },
        setFirstPersonView: jest.fn()
      },
      ship: {
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        blockManager: { blocks: [] },
        group: { children: [], add: jest.fn(), remove: jest.fn(), rotation: { y: 0 } },
        getBlockWorldPosition: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
        steeringWheel: null,
        transform: {
          worldToLocalPosition: (p) => ({ x: p.x, y: p.y, z: p.z }),
          localToWorldPosition: (p) => ({ x: p.x, y: p.y, z: p.z })
        }
      },
      inventory: {
        selectedSlot: 0,
        slots: Array(9).fill(null),
        getSelectedBlock: jest.fn().mockReturnValue({ type: 'wood' })
      },
      controls: {
        blockInteractions: {
          maxPlaceDistance: 4,
          breakBlock: jest.fn().mockReturnValue(false),
          placeBlock: jest.fn().mockReturnValue(false)
        }
      }
    };
    
    // Create mock camera
    mockCamera = {
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      rotation: { x: 0, y: 0, z: 0, order: 'YXZ' },
      updateProjectionMatrix: jest.fn(),
      updateMatrixWorld: jest.fn(),
      lookAt: jest.fn()
    };
    
    // Create mock world
    mockWorld = {
      getBlock: jest.fn().mockReturnValue(null),
      setBlock: jest.fn(),
      removeBlock: jest.fn()
    };
    
    // Create controller
    controller = createPlayerModeController(mockPlayer, mockCamera);
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
    expect(mockPlayer.character.setFirstPersonView).toHaveBeenCalledWith(true);
  });
  
  test('should deactivate player mode', () => {
    controller.activate();
    controller.deactivate();

    expect(controller.active).toBe(false);
  });
  
  test('handleInput should set forward velocity for W key', () => {
    controller.handleInput({
      forward: true,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false
    });

    expect(mockPlayer.character.velocity.z).toBeLessThan(0);
  });

  test('handleInput should set backward velocity for S key', () => {
    controller.handleInput({
      forward: false,
      backward: true,
      left: false,
      right: false,
      up: false,
      down: false
    });

    expect(mockPlayer.character.velocity.z).toBeGreaterThan(0);
  });

  test('handleInput should set left velocity for A key', () => {
    controller.handleInput({
      forward: false,
      backward: false,
      left: true,
      right: false,
      up: false,
      down: false
    });

    expect(mockPlayer.character.velocity.x).toBeLessThan(0);
  });

  test('handleInput should set right velocity for D key', () => {
    controller.handleInput({
      forward: false,
      backward: false,
      left: false,
      right: true,
      up: false,
      down: false
    });

    expect(mockPlayer.character.velocity.x).toBeGreaterThan(0);
  });

  test('handleInput records jump intent without applying velocity immediately', () => {
    mockPlayer.character.isOnGround = true;

    controller.handleInput({
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: true,
      down: false
    });

    expect(mockPlayer.character.velocity.y).toBe(0);
  });

  test('handleInput should not jump in mid-air', () => {
    mockPlayer.character.isOnGround = false;
    mockPlayer.character.velocity.y = -2;

    controller.handleInput({
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: true,
      down: false
    });

    controller.update(0.016);

    expect(mockPlayer.character.velocity.y).toBeLessThan(0);
  });

  test('handleInput should set sneaking when X is pressed', () => {
    controller.handleInput({
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: true
    });

    expect(mockPlayer.character.isSneaking).toBe(true);
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
  
  test('should delegate left click to BlockInteractions.breakBlock', () => {
    const mockEvent = {
      button: 0,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };

    controller.handleMouseDown(mockEvent);

    expect(mockPlayer.controls.blockInteractions.breakBlock).toHaveBeenCalled();
  });
  
  test('should update player position and handle collisions', () => {
    mockPlayer.character.position.x = 0;
    mockPlayer.character.position.y = 10;
    mockPlayer.character.position.z = 0;
    mockPlayer.character.velocity.x = 1;
    mockPlayer.character.velocity.z = 1;
    mockPlayer.character.isOnGround = false;

    controller.update(0.05);
    controller.update(0.05);

    expect(mockPlayer.character.position.x).toBeCloseTo(0.1, 5);
    expect(mockPlayer.character.position.y).toBeLessThan(10);
    expect(mockPlayer.character.position.z).toBeCloseTo(0.1, 5);
    expect(mockPlayer.character.mesh.position.set).toHaveBeenCalled();
  });
}); 