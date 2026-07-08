import { creditShipDamage, tryAwardKillCredit } from '../../../src/combat/damageAttribution.js';
import { updateSinkingState } from '../../../src/combat/shipCombat.js';
import { registerCannonProjectile } from '../../../src/combat/registerProjectile.js';

function mockPlayer(name) {
  return { username: name, kills: 0, deaths: 0 };
}

describe('kill tracking integration', () => {
  test('last damager gets kill when victim hull is destroyed', () => {
    const victim = mockPlayer('victim');
    const killer = mockPlayer('killer');
    const ship = {
      owner: victim,
      lastDamagedBy: null,
      killAwarded: false,
      sinkState: 'none',
      isSinking: false,
      blockManager: {
        blocks: []
      }
    };

    creditShipDamage(ship, killer);
    updateSinkingState(ship, { onKillMessage: () => {} });

    expect(ship.sinkState).toBe('death');
    expect(ship.isSinking).toBe(true);
    expect(killer.kills).toBe(1);
    expect(victim.deaths).toBe(1);
    expect(tryAwardKillCredit(ship, {})).toBe(false);
  });

  test('registerCannonProjectile preserves owner for explosion callback', () => {
    const owner = mockPlayer('shooter');
    const mesh = {
      position: { x: 1, y: 2, z: 3 },
      userData: { velocity: { x: 4, y: 5, z: 6 }, fuseTimer: 2 },
      parent: { remove() {} },
      geometry: { dispose() {} },
      material: { dispose() {} }
    };
    const scene = { add() {}, remove() {} };
    let capturedOwner = null;
    const projectile = registerCannonProjectile(mesh, owner, scene, (pos, dmg, projectileOwner) => {
      capturedOwner = projectileOwner;
    });

    projectile.explode();
    expect(capturedOwner).toBe(owner);
  });
});
