import { updateSinkingState } from '../../../src/combat/shipCombat.js';

function mockPlayer(name) {
  return { username: name, kills: 0, deaths: 0 };
}

function makeShip(blocks, extra = {}) {
  return {
    owner: mockPlayer('victim'),
    lastDamagedBy: mockPlayer('attacker'),
    killAwarded: false,
    sinkState: 'none',
    isSinking: false,
    health: 20,
    blockManager: { blocks },
    ...extra
  };
}

describe('sinking combat messages', () => {
  test('announces sinking without awarding kill on lift loss', () => {
    const messages = [];
    const ship = makeShip([
      { type: 'wood', position: { x: 0, y: 0, z: 0 } },
      { type: 'wood', position: { x: 1, y: 0, z: 0 } },
      { type: 'wood', position: { x: 2, y: 0, z: 0 } },
      { type: 'wood', position: { x: 3, y: 0, z: 0 } }
    ]);

    updateSinkingState(ship, {
      onCombatMessage: (msg) => messages.push(msg),
      onKillMessage: (msg) => messages.push(`KILL:${msg}`)
    });

    expect(ship.sinkState).toBe('lift');
    expect(ship.isSinking).toBe(true);
    expect(ship.killAwarded).toBe(false);
    expect(ship.lastDamagedBy.kills).toBe(0);
    expect(messages.some((m) => m.includes('is sinking'))).toBe(true);
    expect(messages.some((m) => m.startsWith('KILL:'))).toBe(false);
  });

  test('announces recovery when lift is restored', () => {
    const messages = [];
    const ship = makeShip([
      { type: 'wood', position: { x: 0, y: 0, z: 0 } },
      { type: 'wood', position: { x: 1, y: 0, z: 0 } },
      { type: 'wood', position: { x: 2, y: 0, z: 0 } },
      { type: 'wood', position: { x: 3, y: 0, z: 0 } }
    ]);
    ship.sinkState = 'lift';
    ship.isSinking = true;

    ship.blockManager.blocks = [
      { type: 'lift', position: { x: 0, y: 0, z: 0 } },
      { type: 'lift', position: { x: 1, y: 0, z: 0 } },
      { type: 'wood', position: { x: 2, y: 0, z: 0 } },
      { type: 'wood', position: { x: 3, y: 0, z: 0 } }
    ];

    updateSinkingState(ship, {
      onCombatMessage: (msg) => messages.push(msg)
    });

    expect(ship.sinkState).toBe('none');
    expect(messages.some((m) => m.includes('recovered'))).toBe(true);
  });

  test('awards kill only on death sink', () => {
    const messages = [];
    const ship = makeShip([]);

    updateSinkingState(ship, {
      onCombatMessage: (msg) => messages.push(msg),
      onKillMessage: (msg) => messages.push(`KILL:${msg}`)
    });

    expect(ship.sinkState).toBe('death');
    expect(ship.killAwarded).toBe(true);
    expect(ship.lastDamagedBy.kills).toBe(1);
    expect(messages.some((m) => m.includes('sunk') || m.startsWith('KILL:'))).toBe(true);
  });
});
