import {
  resolveShipHullCollision,
  applyRamDamage,
  aabbsOverlap,
  getShipWorldAabb,
  relativeClosingSpeed,
  updateArenaShipCollisions,
  computeRamBlockDamage
} from '../../../src/physics/shipCollision.js';
import { RAM_MIN_SPEED } from '../../../src/combat/shipCombatConfig.js';

function mockShip(name, x, z, vx = 0, vz = 0, blocks = null) {
  const blockList = (blocks ?? [
    { type: 'lift', position: { x: 0, y: 0, z: 0 }, health: 4, maxHealth: 4 },
    { type: 'wood', position: { x: 1, y: 0, z: 0 }, health: 8, maxHealth: 8 }
  ]).map((b) => ({ ...b, position: { ...b.position } }));

  const ship = {
    name,
    owner: { username: name, kills: 0, deaths: 0 },
    position: { x, y: 50, z },
    velocity: { x: vx, y: 0, z: vz },
    group: { position: { set(px, py, pz) { ship.position.x = px; ship.position.y = py; ship.position.z = pz; } } },
    blockManager: {
      blocks: blockList,
      removeBlock(pos) {
        this.blocks = this.blocks.filter(
          (b) => b.position.x !== pos.x || b.position.y !== pos.y || b.position.z !== pos.z
        );
      }
    },
    lastDamagedBy: null,
    killAwarded: false,
    sinkState: 'none',
    isSinking: false,
    health: 20,
    maxHealth: 20,
    getBlockWorldPosition(block) {
      return {
        x: ship.position.x + block.position.x,
        y: ship.position.y + block.position.y,
        z: ship.position.z + block.position.z
      };
    }
  };
  return ship;
}

describe('block AABB ship collision', () => {
  test('closing speed positive when A approaches B', () => {
    const a = mockShip('a', 0, 0, 5, 0);
    const b = mockShip('b', 3, 0, 0, 0);
    expect(relativeClosingSpeed(a, b, 1, 0)).toBeCloseTo(5);
  });

  test('no collision when hulls are apart', () => {
    const a = mockShip('a', 0, 0);
    const b = mockShip('b', 40, 0);
    expect(resolveShipHullCollision(a, b).collided).toBe(false);
  });

  test('overlapping blocks collide and apply impulse without sticky shove', () => {
    const a = mockShip('a', 0, 0, 6, 0);
    const b = mockShip('b', 1.2, 0, 0, 0);
    const beforeVxB = b.velocity.x;

    const contact = resolveShipHullCollision(a, b);
    expect(contact.collided).toBe(true);
    expect(contact.pairs.length).toBeGreaterThan(0);
    // B should receive impulse (independent body), not just be dragged
    expect(b.velocity.x).not.toBe(beforeVxB);
  });

  test('ram damages contact blocks at speed', () => {
    const a = mockShip('a', 0, 0, RAM_MIN_SPEED + 4, 0);
    const b = mockShip('b', 1.0, 0, 0, 0);
    const before = b.blockManager.blocks.length;

    const contact = resolveShipHullCollision(a, b);
    expect(applyRamDamage(a, b, contact, 1000)).toBe(true);
    expect(b.blockManager.blocks.length).toBeLessThan(before);
  });

  test('heavier attacker deals more ram damage than light one', () => {
    const light = computeRamBlockDamage(4, 0.5, 'wood');
    const heavy = computeRamBlockDamage(4, 4, 'wood');
    expect(heavy).toBeGreaterThan(light);
  });

  test('armor takes half ram damage', () => {
    const wood = computeRamBlockDamage(5, 2, 'wood');
    const armor = computeRamBlockDamage(5, 2, 'armor');
    expect(armor).toBeCloseTo(wood * 0.5, 5);
  });

  test('updateArenaShipCollisions uses block contacts', () => {
    const a = mockShip('a', 0, 0, 6, 0);
    const b = mockShip('b', 0.9, 0, 0, 0);
    const before = b.blockManager.blocks.length;

    updateArenaShipCollisions([{ ship: a }, { ship: b }]);
    expect(b.blockManager.blocks.length).toBeLessThan(before);
  });

  test('ship AABB grows with blocks', () => {
    const ship = mockShip('s', 10, 0, 0, 0, [
      { type: 'wood', position: { x: 0, y: 0, z: 0 }, health: 8, maxHealth: 8 },
      { type: 'wood', position: { x: 3, y: 0, z: 0 }, health: 8, maxHealth: 8 }
    ]);
    const aabb = getShipWorldAabb(ship);
    expect(aabb.maxX - aabb.minX).toBeGreaterThanOrEqual(3.5);
    expect(aabbsOverlap(aabb, aabb)).toBe(true);
  });
});
