/**
 * Ship-local collision: grid hitboxes match rotated visuals (placement uses same space).
 */

import * as THREE from 'three';
import ShipTransform from '../../../src/components/ship/ShipTransform.js';
import {
  getLocalCollisionBox,
  getShipLocalBlockBoxes,
  worldMovementToLocal,
  localFeetToWorld,
  getControlBlockFeetWorld
} from '../../../src/physics/shipLocalCollision.js';
import { movePlayer, probeOnGround, integrateVertical } from '../../../src/physics/playerMovement.js';

function makeDeckShip(rotationY, size = 4) {
  const group = new THREE.Group();
  group.position.set(10, 50, 10);
  group.rotation.y = rotationY;

  const ship = {
    position: { x: 10, y: 50, z: 10 },
    rotation: rotationY,
    group,
    blockManager: { blocks: [] },
    steeringWheel: null
  };
  ship.transform = new ShipTransform(ship);

  const blocks = [];
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      mesh.position.set(x, 0, z);
      group.add(mesh);
      const block = { type: x === 0 && z === 0 ? 'control' : 'wood', position: { x, y: 0, z }, mesh };
      blocks.push(block);
    }
  }
  ship.blockManager.blocks = blocks;
  ship.steeringWheel = blocks.find((b) => b.type === 'control');
  group.updateMatrixWorld(true);
  return ship;
}

function simulateWorldWalk(ship, wx, wy, wz, worldDx, worldDz, frames = 90) {
  const speed = Math.hypot(worldDx, worldDz);
  const dt = 1 / 60;
  const boxes = getShipLocalBlockBoxes(ship);

  for (let i = 0; i < frames; i++) {
    const dx = worldDx * dt;
    const dz = worldDz * dt;
    const local = worldMovementToLocal(ship, wx, wy, wz, dx, 0, dz);
    const moved = movePlayer(local.x, local.y, local.z, local.dx, 0, local.dz, boxes, false);
    const feet = localFeetToWorld(ship, moved.x, moved.y, moved.z);
    wx = feet.x;
    wy = feet.y;
    wz = feet.z;
  }
  return ship.transform.worldToLocalPosition({ x: wx, y: wy, z: wz });
}

describe('getLocalCollisionBox', () => {
  test('unit AABB centered on block cell', () => {
    const box = getLocalCollisionBox({ position: { x: 2, y: 0, z: -1 } });
    expect(box.min).toEqual({ x: 1.5, y: -0.5, z: -1.5 });
    expect(box.max).toEqual({ x: 2.5, y: 0.5, z: -0.5 });
  });

  test('adjacent deck cells do not overlap in local space', () => {
    const a = getLocalCollisionBox({ position: { x: 0, y: 0, z: 0 } });
    const b = getLocalCollisionBox({ position: { x: 1, y: 0, z: 0 } });
    expect(a.max.x).toBeLessThanOrEqual(b.min.x);
  });
});

describe('getControlBlockFeetWorld', () => {
  test('feet on control block top rotate with ship', () => {
    const ship = makeDeckShip(Math.PI / 2);
    const feet = getControlBlockFeetWorld(ship);
    expect(feet).not.toBeNull();
    const back = ship.transform.worldToLocalPosition(feet);
    expect(back.x).toBeCloseTo(0, 5);
    expect(back.y).toBeCloseTo(0.5, 5);
    expect(back.z).toBeCloseTo(0, 5);
  });

  test('ignores blocks without mesh in scene', () => {
    const ship = makeDeckShip(0, 2);
    const ghost = {
      type: 'wood',
      position: { x: 5, y: 0, z: 5 },
      mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    };
    ship.blockManager.blocks.push(ghost);
    expect(getShipLocalBlockBoxes(ship)).toHaveLength(4);
  });
});

describe('rotated ship walking', () => {
  const cases = [
    { label: '0°', rotation: 0 },
    { label: '45°', rotation: Math.PI / 4 },
    { label: '90°', rotation: Math.PI / 2 }
  ];

  for (const { label, rotation } of cases) {
    test(`walks world +X on deck at ${label}`, () => {
      const ship = makeDeckShip(rotation);
      const start = getControlBlockFeetWorld(ship);
      const end = simulateWorldWalk(ship, start.x, start.y, start.z, 4.317, 0);
      const dist = Math.hypot(end.x - 0, end.z - 0);
      expect(dist).toBeGreaterThan(1);
    });

    test(`walks world +Z on deck at ${label}`, () => {
      const ship = makeDeckShip(rotation);
      const start = getControlBlockFeetWorld(ship);
      const end = simulateWorldWalk(ship, start.x, start.y, start.z, 0, 4.317);
      const dist = Math.hypot(end.x - 0, end.z - 0);
      expect(dist).toBeGreaterThan(1);
    });
  }
});

describe('jump and crouch on rotated ship', () => {
  test('jump leaves ground then lands on rotated deck', () => {
    const ship = makeDeckShip(Math.PI / 3);
    const feet = getControlBlockFeetWorld(ship);
    const boxes = getShipLocalBlockBoxes(ship);
    const local = ship.transform.worldToLocalPosition(feet);

    let motionY = 0;
    let ly = local.y;
    let onGround = true;
    let maxY = ly;

    for (let i = 0; i < 40; i++) {
      const step = integrateVertical(motionY, onGround, onGround && i === 0, 1 / 60);
      motionY = step.motionY;
      const moved = movePlayer(local.x, ly, local.z, 0, step.deltaY, 0, boxes, false);
      ly = moved.y;
      onGround = moved.onGround || probeOnGround(local.x, ly, local.z, boxes, false);
      maxY = Math.max(maxY, ly);
    }

    expect(maxY).toBeGreaterThan(local.y + 0.5);
    expect(ly).toBeCloseTo(local.y, 1);
  });

  test('sneak height uses shorter hitbox without falling through deck', () => {
    const ship = makeDeckShip(Math.PI / 2);
    const feet = getControlBlockFeetWorld(ship);
    const local = ship.transform.worldToLocalPosition(feet);
    const boxes = getShipLocalBlockBoxes(ship);
    const moved = movePlayer(local.x, local.y, local.z, 0.05, 0, 0.05, boxes, true);
    expect(probeOnGround(moved.x, moved.y, moved.z, boxes, true)).toBe(true);
  });
});

describe('worldMovementToLocal', () => {
  test('round-trips feet position through move', () => {
    const ship = makeDeckShip(Math.PI / 4);
    const feet = getControlBlockFeetWorld(ship);
    const localMove = worldMovementToLocal(ship, feet.x, feet.y, feet.z, 0.1, 0, 0.2);
    const moved = movePlayer(
      localMove.x,
      localMove.y,
      localMove.z,
      localMove.dx,
      localMove.dy,
      localMove.dz,
      getShipLocalBlockBoxes(ship),
      false
    );
    const world = localFeetToWorld(ship, moved.x, moved.y, moved.z);
    const back = ship.transform.worldToLocalPosition(world);
    expect(back.x).toBeCloseTo(moved.x, 4);
    expect(back.y).toBeCloseTo(moved.y, 4);
    expect(back.z).toBeCloseTo(moved.z, 4);
  });
});
