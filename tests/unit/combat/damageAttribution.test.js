import {
  creditShipDamage,
  tryAwardKillCredit,
  resetShipCombatCredit,
  isCombatPlayer
} from '../../../src/combat/damageAttribution.js';

function mockPlayer(name, extra = {}) {
  return { username: name, kills: 0, deaths: 0, ...extra };
}

function mockShip(owner, extra = {}) {
  return {
    owner,
    lastDamagedBy: null,
    killAwarded: false,
    ...extra
  };
}

describe('damageAttribution', () => {
  test('credits last damager on enemy ship', () => {
    const victim = mockPlayer('victim');
    const killer = mockPlayer('killer');
    const ship = mockShip(victim);

    creditShipDamage(ship, killer);
    expect(ship.lastDamagedBy).toBe(killer);
  });

  test('ignores self damage credit', () => {
    const player = mockPlayer('solo');
    const ship = mockShip(player);

    creditShipDamage(ship, player);
    expect(ship.lastDamagedBy).toBeNull();
  });

  test('awards kill once when sinking after enemy damage', () => {
    const victim = mockPlayer('victim');
    const killer = mockPlayer('killer');
    const ship = mockShip(victim, { lastDamagedBy: killer });
    const messages = [];

    const awarded = tryAwardKillCredit(ship, {
      onKillMessage: (msg) => messages.push(msg)
    });

    expect(awarded).toBe(true);
    expect(ship.killAwarded).toBe(true);
    expect(killer.kills).toBe(1);
    expect(victim.deaths).toBe(1);
    expect(messages[0]).toContain('killer destroyed victim');

    const again = tryAwardKillCredit(ship, { onKillMessage: (msg) => messages.push(msg) });
    expect(again).toBe(false);
    expect(killer.kills).toBe(1);
  });

  test('resetShipCombatCredit clears attribution', () => {
    const ship = mockShip(mockPlayer('a'), {
      lastDamagedBy: mockPlayer('b'),
      killAwarded: true
    });
    resetShipCombatCredit(ship);
    expect(ship.lastDamagedBy).toBeNull();
    expect(ship.killAwarded).toBe(false);
  });

  test('isCombatPlayer validates username', () => {
    expect(isCombatPlayer({ username: 'x' })).toBe(true);
    expect(isCombatPlayer({ username: '' })).toBe(false);
    expect(isCombatPlayer(null)).toBe(false);
  });
});
