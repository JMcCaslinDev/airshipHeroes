import {
  pickArenaSpawn,
  applySpawnToShip,
  SPAWN_Y_MIN,
  SPAWN_Y_MAX,
  SPAWN_RADIUS_MIN,
  SPAWN_RADIUS_MAX
} from '../../../src/combat/spawnPlacement.js';

describe('spawnPlacement', () => {
  test('pickArenaSpawn stays above map with inbound velocity', () => {
    let i = 0;
    const rng = () => [0.1, 0.5, 0.9, 0.2][i++ % 4];

    const spawn = pickArenaSpawn(rng);

    expect(spawn.position.y).toBeGreaterThanOrEqual(SPAWN_Y_MIN);
    expect(spawn.position.y).toBeLessThanOrEqual(SPAWN_Y_MAX);
    const radius = Math.hypot(spawn.position.x, spawn.position.z);
    expect(radius).toBeGreaterThanOrEqual(SPAWN_RADIUS_MIN);
    expect(radius).toBeLessThanOrEqual(SPAWN_RADIUS_MAX + 0.01);
    expect(spawn.speed).toBeGreaterThan(0);
  });

  test('applySpawnToShip sets group position and cruise velocity', () => {
    const ship = {
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: 1,
      blockManager: { blocks: [{ type: 'engine' }, { type: 'engine' }] },
      group: { position: { set() {} }, rotation: { y: 0 } }
    };
    const spawn = {
      position: { x: 10, y: 60, z: -20 },
      rotation: 1.2,
      speed: 4
    };

    applySpawnToShip(ship, spawn);

    expect(ship.position.x).toBe(10);
    expect(ship.position.y).toBe(60);
    expect(ship.rotation).toBe(1.2);
    expect(Math.hypot(ship.velocity.x, ship.velocity.z)).toBeCloseTo(4, 1);
    expect(ship.angularVelocity).toBe(0);
    expect(ship.maxSpeed).toBe(10);
  });

  test('applySpawnToShip clamps cruise to engine max speed', () => {
    const ship = {
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: 0,
      blockManager: { blocks: [{ type: 'wood' }] },
      group: { position: { set() {} }, rotation: { y: 0 } }
    };

    applySpawnToShip(ship, {
      position: { x: 0, y: 50, z: 0 },
      rotation: 0,
      speed: 4
    });

    expect(ship.maxSpeed).toBe(0);
    expect(Math.hypot(ship.velocity.x, ship.velocity.z)).toBe(0);
  });
});
