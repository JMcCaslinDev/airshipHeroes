import { updateShipSinking } from '../../../src/combat/sinkingSystem.js';
import { updateSinkingState, hasEnoughLift } from '../../../src/combat/shipCombat.js';
import { MIN_LIFT_RATIO } from '../../../src/combat/shipCombatConfig.js';

function mockShip(blocks) {
  const group = { rotation: { x: 0, y: 0, z: 0 } };
  return {
    isSinking: false,
    sinkState: 'none',
    isDestroyed: false,
    sinkingTiltAmount: 0,
    sinkingStartTime: 0,
    rotation: 0,
    group,
    blockManager: { blocks },
    getBlockWorldPosition(block) {
      return { x: block.position.x, y: block.position.y, z: block.position.z };
    }
  };
}

describe('sinkingSystem', () => {
  test('pitch increases while sinking', () => {
    const ship = mockShip([{ type: 'wood', position: { x: 0, y: 0, z: 0 }, mesh: { clone: () => ({ position: { set() {} }, rotation: { set() {} } }) } }]);
    ship.isSinking = true;
    ship.sinkState = 'lift';

    updateShipSinking(ship, 1, null);

    expect(ship.sinkingTiltAmount).toBeGreaterThan(0);
    expect(ship.group.rotation.x).toBeGreaterThan(0);
  });

  test('pitch resets when no longer sinking', () => {
    const ship = mockShip([]);
    ship.sinkingTiltAmount = 0.15;
    ship.group.rotation.x = 0.15;

    updateShipSinking(ship, 0.1, null);

    expect(ship.sinkingTiltAmount).toBe(0);
    expect(ship.group.rotation.x).toBe(0);
  });
});

describe('lift sinking threshold', () => {
  test(`requires at least ${MIN_LIFT_RATIO * 100}% lift`, () => {
    const ok = mockShip([
      { type: 'lift', position: { x: 0, y: 0, z: 0 } },
      { type: 'lift', position: { x: 1, y: 0, z: 0 } },
      { type: 'wood', position: { x: 2, y: 0, z: 0 } },
      { type: 'wood', position: { x: 3, y: 0, z: 0 } }
    ]);
    expect(hasEnoughLift(ok)).toBe(true);

    const low = mockShip([
      { type: 'lift', position: { x: 0, y: 0, z: 0 } },
      { type: 'wood', position: { x: 1, y: 0, z: 0 } },
      { type: 'wood', position: { x: 2, y: 0, z: 0 } },
      { type: 'wood', position: { x: 3, y: 0, z: 0 } },
      { type: 'wood', position: { x: 4, y: 0, z: 0 } }
    ]);
    expect(hasEnoughLift(low)).toBe(false);
    updateSinkingState(low);
    expect(low.sinkState).toBe('lift');
    expect(low.isSinking).toBe(true);
  });
});
