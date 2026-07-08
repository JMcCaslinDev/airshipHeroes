/**
 * ShipTransform round-trip tests (rotation-aware block placement guardrail)
 */

import ShipTransform from '../../../src/components/ship/ShipTransform.js';

function makeShip(position, rotation) {
  return {
    position,
    rotation,
    group: null
  };
}

describe('ShipTransform', () => {
  test('localToWorld → worldToLocal round-trip at 45° rotation', () => {
    const ship = makeShip({ x: 10, y: 50, z: -20 }, Math.PI / 4);
    const transform = new ShipTransform(ship);
    const local = { x: 3, y: 1, z: -2 };

    const world = transform.localToWorldPosition(local);
    const back = transform.worldToLocalPosition(world);

    expect(back.x).toBeCloseTo(local.x, 5);
    expect(back.y).toBeCloseTo(local.y, 5);
    expect(back.z).toBeCloseTo(local.z, 5);
  });

  test('world face normal maps to ship-local grid direction when rotated 90°', () => {
    const ship = makeShip({ x: 0, y: 0, z: 0 }, Math.PI / 2);
    const transform = new ShipTransform(ship);

    const localDir = transform.worldToLocalDirection({ x: 1, y: 0, z: 0 });

    expect(Math.round(localDir.x)).toBe(0);
    expect(Math.round(localDir.y)).toBe(0);
    expect(Math.round(localDir.z)).toBe(1);
  });
});
