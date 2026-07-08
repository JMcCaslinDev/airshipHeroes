import {
  createSpawnIntro,
  updateSpawnIntro,
  syncSpawnIntroPlayer,
  isSpawnIntroActive,
  isSpawnIntroLocked,
  isSpawnBoostActive,
  lerpAngle,
  shipTravelLookYaw,
  SPAWN_INTRO_SECONDS
} from '../../../src/combat/spawnIntro.js';

function makeShip({ x = 0, y = 50, z = 0, rotation = 0 } = {}) {
  const position = { x, y, z };
  return {
    rotation,
    position,
    velocity: { x: 0, y: 0, z: 0 },
    steeringWheel: { position: { x: 0, y: 0, z: 0 } },
    transform: {
      localToWorldPosition(local) {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        return {
          x: position.x + local.x * cos + local.z * sin,
          y: position.y + local.y,
          z: position.z - local.x * sin + local.z * cos
        };
      }
    }
  };
}

describe('spawnIntro', () => {
  test('unlocks after camera lock but keeps boost until press+release', () => {
    let unlocked = false;
    const ship = makeShip({ rotation: 0 });
    const intro = createSpawnIntro({ username: 'p', cameraRotation: { x: 0, y: 0 } }, ship, () => {
      unlocked = true;
    });
    intro.wind = { remove() {} };

    expect(isSpawnIntroLocked(intro)).toBe(true);
    expect(isSpawnBoostActive(intro)).toBe(true);

    while (isSpawnIntroLocked(intro)) {
      updateSpawnIntro(intro, 1, {});
    }

    expect(unlocked).toBe(true);
    expect(isSpawnBoostActive(intro)).toBe(true);
    expect(isSpawnIntroActive(intro)).toBe(true);
    expect(ship.velocity.z).toBeGreaterThan(0);

    // Holding W does not end boost
    expect(updateSpawnIntro(intro, 0.1, { forward: true })).toBe('boost');
    expect(isSpawnBoostActive(intro)).toBe(true);

    // Release ends boost
    expect(updateSpawnIntro(intro, 0.1, {})).toBe(false);
    expect(isSpawnBoostActive(intro)).toBe(false);
    expect(isSpawnIntroActive(intro)).toBe(false);
  });

  test('pins player to ship as it moves', () => {
    const ship = makeShip({ x: 10, y: 50, z: 20 });
    const player = {
      cameraRotation: { x: 0.2, y: 1.5 },
      character: {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 5, y: 0, z: 0 },
        rotation: 0,
        mesh: { position: { set() {} }, rotation: { y: 0 } }
      }
    };
    const intro = createSpawnIntro(player, ship, null);

    syncSpawnIntroPlayer(intro);
    expect(player.character.position.x).toBeCloseTo(10);
    expect(player.character.position.y).toBeCloseTo(50.5);
    expect(player.character.position.z).toBeCloseTo(20);
    expect(player.character.velocity.x).toBe(0);

    ship.position.x = 18;
    syncSpawnIntroPlayer(intro);
    expect(player.character.position.x).toBeCloseTo(18);
  });

  test('lerpAngle takes shortest path', () => {
    expect(lerpAngle(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2);
    expect(lerpAngle(0, -Math.PI / 2, 0.5)).toBeCloseTo(-Math.PI / 4);
  });

  test('eases camera yaw toward ship travel look direction', () => {
    const ship = makeShip({ rotation: 0 });
    const player = {
      cameraRotation: { x: 0.5, y: Math.PI },
      character: {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: 0,
        mesh: { position: { set() {} }, rotation: { y: 0 } }
      }
    };
    const intro = createSpawnIntro(player, ship, null);
    // Mid-intro: yaw between start (lookYaw + 0.7π) and lookYaw (π)
    intro.remaining = SPAWN_INTRO_SECONDS * 0.5;
    syncSpawnIntroPlayer(intro);
    expect(intro.cameraYaw).toBeGreaterThan(Math.PI);
    expect(intro.cameraYaw).toBeLessThan(Math.PI + Math.PI * 0.7);

    intro.remaining = 0;
    syncSpawnIntroPlayer(intro);
    expect(intro.cameraYaw).toBeCloseTo(Math.PI, 1);
    expect(intro.cameraPitch).toBeCloseTo(0.35, 1);
    expect(player.character.rotation).toBeCloseTo(Math.PI, 5);
  });

  test('SPAWN_INTRO_SECONDS is the camera lock window', () => {
    expect(SPAWN_INTRO_SECONDS).toBe(4);
  });

  test('shipTravelLookYaw is ship rotation + π', () => {
    expect(shipTravelLookYaw(0)).toBeCloseTo(Math.PI);
    expect(shipTravelLookYaw(Math.PI / 2)).toBeCloseTo(Math.PI * 1.5);
  });
});
