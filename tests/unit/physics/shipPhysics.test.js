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

  test('sustained forward thrust approaches cruise max (half absolute)', () => {
    mockShip.controls.forward = true;
    for (let i = 0; i < 200; i++) {
      updateShipPhysics(mockShip, mockWorldManager, 0.05);
    }
    const speed = Math.hypot(mockShip.velocity.x, mockShip.velocity.z);
    expect(mockShip.cruiseMaxSpeed).toBeGreaterThan(0);
    expect(speed).toBeGreaterThan(mockShip.cruiseMaxSpeed * 0.95);
    expect(speed).toBeLessThanOrEqual(mockShip.cruiseMaxSpeed + 0.01);
  });

  test('boost unlocks upper half of max speed', () => {
    mockShip.controls.forward = true;
    mockShip.controls.boost = true;
    // Stay within BOOST_DURATION (5s)
    for (let i = 0; i < 80; i++) {
      updateShipPhysics(mockShip, mockWorldManager, 0.05);
    }
    const speed = Math.hypot(mockShip.velocity.x, mockShip.velocity.z);
    expect(mockShip.boostActive).toBe(true);
    expect(speed).toBeGreaterThan(mockShip.cruiseMaxSpeed);
    expect(speed).toBeLessThanOrEqual(mockShip.maxSpeed + 0.01);
  });

  test('boost doubles acceleration while active', () => {
    const normal = makeMockShip();
    const boosted = makeMockShip();
    normal.controls.forward = true;
    boosted.controls.forward = true;
    boosted.controls.boost = true;

    updateShipPhysics(normal, mockWorldManager, 0.2);
    updateShipPhysics(boosted, mockWorldManager, 0.2);

    const n = Math.hypot(normal.velocity.x, normal.velocity.z);
    const b = Math.hypot(boosted.velocity.x, boosted.velocity.z);
    expect(boosted.boostActive).toBe(true);
    expect(b).toBeGreaterThan(n * 1.5);
  });

  test('coasting decelerates roughly 1 mph per second', () => {
    const { SHIP_DECEL, SPEED_TO_MPH } = require('../../../src/physics/shipPerformance.js');
    mockShip.velocity.z = 5;
    mockShip.controls.forward = false;
    updateShipPhysics(mockShip, mockWorldManager, 1);
    const speed = Math.hypot(mockShip.velocity.x, mockShip.velocity.z);
    expect(speed).toBeCloseTo(5 - SHIP_DECEL, 1);
    expect(SHIP_DECEL * SPEED_TO_MPH).toBeCloseTo(1, 5);
  });

  test('after boost ends, speed bleeds down to cruise instead of snapping', () => {
    mockShip.controls.forward = true;
    mockShip.controls.boost = true;
    for (let i = 0; i < 80; i++) {
      updateShipPhysics(mockShip, mockWorldManager, 0.05);
    }
    const boosted = Math.hypot(mockShip.velocity.x, mockShip.velocity.z);
    expect(boosted).toBeGreaterThan(mockShip.cruiseMaxSpeed);

    mockShip.controls.boost = false;
    mockShip.boostActive = false;
    if (mockShip.boost) {
      mockShip.boost.active = false;
    }
    updateShipPhysics(mockShip, mockWorldManager, 0.05);
    const after = Math.hypot(mockShip.velocity.x, mockShip.velocity.z);
    expect(after).toBeGreaterThan(mockShip.cruiseMaxSpeed);
    expect(after).toBeLessThan(boosted);
  });
});
