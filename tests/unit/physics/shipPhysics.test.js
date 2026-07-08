/**
 * Unit tests for ship physics
 */

import {
  updateShipPhysics,
  applyForce,
  applyTorque,
  enforceWorldBoundaries
} from '../../../src/physics/shipPhysics.js';
import * as THREE from 'three';

jest.mock('three', () => ({
  Vector3: jest.fn().mockImplementation(function Vector3(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.set = jest.fn();
    this.applyAxisAngle = jest.fn(function applyAxisAngle() {
      const cos = Math.cos(0);
      const sin = Math.sin(0);
      const nx = this.x * cos - this.z * sin;
      const nz = this.x * sin + this.z * cos;
      this.x = nx;
      this.z = nz;
      return this;
    });
  })
}));

function makeMockShip(overrides = {}) {
  return {
    blockManager: {
      blocks: [
        { type: 'wood', position: { x: 0, y: 0, z: 0 } },
        { type: 'wood', position: { x: 1, y: 0, z: 0 } },
        { type: 'lift', position: { x: 0, y: 1, z: 0 } },
        { type: 'engine', position: { x: 0, y: 0, z: 1 } }
      ]
    },
    position: { x: 0, y: 100, z: 0 },
    rotation: 0,
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: 0,
    isSinking: false,
    sinkRate: 1,
    controls: {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false
    },
    group: {
      position: { set: jest.fn() },
      rotation: { y: 0, z: 0 }
    },
    bankAngle: 0,
    ...overrides
  };
}

describe('Ship Physics', () => {
  let mockShip;
  const mockWorldManager = { getBlock: jest.fn().mockReturnValue(null) };

  beforeEach(() => {
    mockShip = makeMockShip();
  });

  test('forward control increases Z velocity', () => {
    mockShip.controls.forward = true;
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.velocity.z).toBeGreaterThan(0);
  });

  test('backward control decreases Z velocity', () => {
    mockShip.controls.backward = true;
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.velocity.z).toBeLessThan(0);
  });

  test('left control applies positive angular velocity', () => {
    mockShip.controls.left = true;
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.angularVelocity).toBeGreaterThan(0);
  });

  test('right control applies negative angular velocity', () => {
    mockShip.controls.right = true;
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.angularVelocity).toBeLessThan(0);
  });

  test('ship is neutrally buoyant with sufficient lift blocks', () => {
    mockShip.blockManager.blocks.push(
      { type: 'lift', position: { x: 1, y: 1, z: 0 } },
      { type: 'lift', position: { x: 2, y: 1, z: 0 } }
    );
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.isSinking).toBe(false);
  });

  test('ship sinks with insufficient lift blocks', () => {
    mockShip.blockManager.blocks = mockShip.blockManager.blocks.filter(b => b.type !== 'lift');
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.isSinking).toBe(true);
  });

  test('sinking applies downward velocity', () => {
    mockShip.isSinking = true;
    mockShip.blockManager.blocks = mockShip.blockManager.blocks.filter(b => b.type !== 'lift');
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.velocity.y).toBeLessThan(0);
  });

  test('enforceWorldBoundaries clamps altitude', () => {
    mockShip.position.y = 600;
    enforceWorldBoundaries(mockShip, 500);
    expect(mockShip.position.y).toBe(500);
  });

  test('bank angle leans into turn and recovers toward level', () => {
    mockShip.angularVelocity = 0.3;
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.bankAngle).toBeLessThan(0);
    expect(Math.abs(mockShip.bankAngle)).toBeLessThanOrEqual(0.12);

    mockShip.angularVelocity = 0;
    mockShip.controls.left = false;
    mockShip.controls.right = false;
    for (let i = 0; i < 30; i++) {
      updateShipPhysics(mockShip, mockWorldManager, 0.1);
    }
    expect(Math.abs(mockShip.bankAngle)).toBeLessThan(0.02);
  });

  test('vertical control is slower than old instant movement', () => {
    mockShip.controls.up = true;
    updateShipPhysics(mockShip, mockWorldManager, 0.1);
    expect(mockShip.velocity.y).toBeGreaterThan(0);
    expect(mockShip.velocity.y).toBeLessThan(1);
  });
});
