/**
 * Block placement on rotated ships — grid must follow ship orientation.
 */

import * as THREE from 'three';
import ShipTransform from '../../../src/components/ship/ShipTransform.js';

function makeRotatedShip(rotationY, bankZ = 0) {
  const group = new THREE.Group();
  group.position.set(10, 50, 10);
  group.rotation.y = rotationY;
  group.rotation.z = bankZ;

  const ship = {
    position: { x: 10, y: 50, z: 10 },
    rotation: rotationY,
    group,
    blockManager: { blocks: [] }
  };
  ship.transform = new ShipTransform(ship);

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  mesh.position.set(0, 0, 0);
  group.add(mesh);

  const block = { type: 'wood', position: { x: 0, y: 0, z: 0 }, mesh };
  ship.blockManager.blocks = [block];

  group.updateMatrixWorld(true);
  return { ship, mesh, block };
}

function raycastBlock(mesh, origin, direction) {
  const raycaster = new THREE.Raycaster(origin, direction.normalize());
  const hits = raycaster.intersectObject(mesh, false);
  return hits[0] ?? null;
}

describe('computePlacementCellFromIntersection', () => {
  test('unrotated ship: +X face places block at (1,0,0) local', () => {
    const { ship, mesh } = makeRotatedShip(0);
    const intersection = raycastBlock(
      mesh,
      new THREE.Vector3(11, 50, 10),
      new THREE.Vector3(-1, 0, 0)
    );

    expect(intersection).toBeTruthy();

    const cell = ship.transform.computePlacementCellFromIntersection(intersection);
    expect(cell).toEqual({ x: 1, y: 0, z: 0 });
  });

  test('ship rotated 90°: world +X face places on player side, not opposite', () => {
    const { ship, mesh } = makeRotatedShip(Math.PI / 2);
    const intersection = raycastBlock(
      mesh,
      new THREE.Vector3(20, 50, 10),
      new THREE.Vector3(-1, 0, 0)
    );

    expect(intersection).toBeTruthy();

    const cell = ship.transform.computePlacementCellFromIntersection(intersection);
    // World +X from ship center is ship-local +Z at 90° yaw
    expect(cell).toEqual({ x: 0, y: 0, z: 1 });
    expect(cell).not.toEqual({ x: 0, y: 0, z: -1 });
  });

  test('ship rotated 180°: approaching from world -Z places adjacent cell on hit side', () => {
    const { ship, mesh } = makeRotatedShip(Math.PI);
    const intersection = raycastBlock(
      mesh,
      new THREE.Vector3(10, 50, 9),
      new THREE.Vector3(0, 0, 1)
    );

    expect(intersection).toBeTruthy();

    const cell = ship.transform.computePlacementCellFromIntersection(intersection);
    expect(cell).toEqual({ x: 0, y: 0, z: 1 });
  });

  test('ship rotated 270°: +Z world face places at (1,0,0) local', () => {
    const { ship, mesh } = makeRotatedShip(-Math.PI / 2);
    const intersection = raycastBlock(
      mesh,
      new THREE.Vector3(10, 50, 20),
      new THREE.Vector3(0, 0, -1)
    );

    expect(intersection).toBeTruthy();

    const cell = ship.transform.computePlacementCellFromIntersection(intersection);
    expect(cell).toEqual({ x: 1, y: 0, z: 0 });
  });

  test('bank angle does not flip placement to opposite face', () => {
    const { ship, mesh } = makeRotatedShip(Math.PI / 2, 0.12);
    const intersection = raycastBlock(
      mesh,
      new THREE.Vector3(20, 50, 10),
      new THREE.Vector3(-1, 0, 0)
    );

    expect(intersection).toBeTruthy();

    const cell = ship.transform.computePlacementCellFromIntersection(intersection);
    expect(cell).toEqual({ x: 0, y: 0, z: 1 });
  });

  test('top face (+Y) places at (0,1,0) regardless of yaw', () => {
    const { ship, mesh } = makeRotatedShip(Math.PI / 3);
    const intersection = raycastBlock(
      mesh,
      new THREE.Vector3(10, 51, 10),
      new THREE.Vector3(0, -1, 0)
    );

    expect(intersection).toBeTruthy();

    const cell = ship.transform.computePlacementCellFromIntersection(intersection);
    expect(cell).toEqual({ x: 0, y: 1, z: 0 });
  });
});

describe('ShipTransform matrix path', () => {
  test('localToWorld → worldToLocal round-trip with group matrix at 45°', () => {
    const { ship } = makeRotatedShip(Math.PI / 4);
    const local = { x: 3, y: 1, z: -2 };

    const world = ship.transform.localToWorldPosition(local);
    const back = ship.transform.worldToLocalPosition(world);

    expect(back.x).toBeCloseTo(local.x, 5);
    expect(back.y).toBeCloseTo(local.y, 5);
    expect(back.z).toBeCloseTo(local.z, 5);
  });

  test('world +X direction maps to ship-local +Z when yaw is 90° (matrix path)', () => {
    const { ship } = makeRotatedShip(Math.PI / 2);
    const localDir = ship.transform.worldToLocalDirection({ x: 1, y: 0, z: 0 });

    expect(Math.round(localDir.x)).toBe(0);
    expect(Math.round(localDir.y)).toBe(0);
    expect(Math.round(localDir.z)).toBe(1);
  });
});
