import { createSpawnIntro, syncSpawnIntroPlayer } from '../../../src/combat/spawnIntro.js';

describe('spawnIntro deck pin', () => {
  test('pins character via showShipModeOutline on ship', () => {
    const outlineCalls = [];
    const ship = {
      rotation: 1.2,
      transform: {
        localToWorldPosition: ({ x, y, z }) => ({ x: x + 10, y: y + 20, z: z + 30 })
      },
      steeringWheel: { position: { x: 1, y: 2, z: 3 } },
      blockManager: { blocks: [] },
      group: {},
      velocity: { x: 0, y: 0, z: 0 },
      maxSpeed: 5
    };
    const player = {
      character: {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        mesh: { position: { set() {} }, rotation: { y: 0 } },
        showShipModeOutline: (world, s) => outlineCalls.push({ world, s })
      },
      cameraRotation: { x: 0, y: 0 }
    };

    const intro = createSpawnIntro(player, ship);
    syncSpawnIntroPlayer(intro, { setOrbitAngles() {} });

    expect(outlineCalls.length).toBe(1);
    expect(outlineCalls[0].s).toBe(ship);
    expect(player.character.position).toEqual({ x: 11, y: 22.5, z: 33 });
    // Look yaw = ship.rotation + π (camera −Z vs ship +Z)
    expect(player.character.rotation).toBeCloseTo(1.2 + Math.PI);
    expect(player.character.mesh.rotation.y).toBeCloseTo(1.2 + Math.PI);
  });
});
