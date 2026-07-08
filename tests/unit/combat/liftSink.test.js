import {
  computeLiftSinkProfile,
  getLiftDeficit,
  updateSinkingState
} from '../../../src/combat/shipCombat.js';
import {
  LIFT_SINK_RATE_MAX,
  LIFT_SINK_RATE_MIN,
  MIN_LIFT_RATIO
} from '../../../src/combat/shipCombatConfig.js';

function makeShip(blocks, extra = {}) {
  return {
    health: 10,
    sinkState: 'none',
    isSinking: false,
    sinkRate: 0,
    sinkHorizontalDrag: 0,
    blockManager: { blocks },
    ...extra
  };
}

describe('lift-proportional sinking', () => {
  test('no deficit at or above min lift', () => {
    expect(getLiftDeficit(MIN_LIFT_RATIO)).toBe(0);
    expect(getLiftDeficit(0.5)).toBe(0);
    expect(computeLiftSinkProfile(0.4).sinkRate).toBe(LIFT_SINK_RATE_MIN);
    expect(computeLiftSinkProfile(0.4).horizontalDrag).toBe(0);
  });

  test('zero lift sinks fastest and steeper', () => {
    const zero = computeLiftSinkProfile(0);
    const nearMin = computeLiftSinkProfile(MIN_LIFT_RATIO * 0.9);

    expect(zero.sinkRate).toBeCloseTo(LIFT_SINK_RATE_MAX);
    expect(zero.horizontalDrag).toBeGreaterThan(nearMin.horizontalDrag);
    expect(zero.sinkRate).toBeGreaterThan(nearMin.sinkRate);
  });

  test('updateSinkingState scales with lift % and clears when restored', () => {
    const ship = makeShip([
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' }
    ]);

    updateSinkingState(ship);
    expect(ship.isSinking).toBe(true);
    expect(ship.sinkState).toBe('lift');
    expect(ship.sinkRate).toBeCloseTo(LIFT_SINK_RATE_MAX);
    expect(ship.sinkHorizontalDrag).toBeGreaterThan(0.5);

    ship.blockManager.blocks = [
      { type: 'lift' },
      { type: 'lift' },
      { type: 'wood' },
      { type: 'wood' }
    ];
    updateSinkingState(ship);
    expect(ship.isSinking).toBe(false);
    expect(ship.sinkState).toBe('none');
  });

  test('partial lift sinks slower than zero lift', () => {
    const low = makeShip([
      { type: 'lift' },
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' }
    ]);
    updateSinkingState(low);

    const none = makeShip([
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' },
      { type: 'wood' }
    ]);
    updateSinkingState(none);

    expect(low.sinkRate).toBeLessThan(none.sinkRate);
    expect(low.sinkHorizontalDrag).toBeLessThan(none.sinkHorizontalDrag);
  });
});
