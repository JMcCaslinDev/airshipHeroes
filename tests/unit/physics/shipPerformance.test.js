import {
  computeShipPerformance,
  ENGINE_SPEED_BONUS
} from '../../../src/physics/shipPerformance.js';

describe('shipPerformance', () => {
  test('engines add speed and weight subtracts', () => {
    const perf = computeShipPerformance([
      { type: 'engine' },
      { type: 'engine' },
      { type: 'lift' },
      { type: 'armor' },
      { type: 'wood' },
      { type: 'redstone' },
      { type: 'dispenser' },
      { type: 'control' }
    ]);

    // 2*5 - (0.1 + 0.2 + 0.1 + 0 + 0.1 + 0.1) = 10 - 0.6
    expect(perf.engines).toBe(2);
    expect(perf.weight).toBe(0.6);
    expect(perf.maxSpeed).toBe(9.4);
    expect(perf.cruiseMaxSpeed).toBe(4.7);
    expect(perf.maxSpeed).toBe(2 * ENGINE_SPEED_BONUS - perf.weight);
  });

  test('no engines means zero max speed even with light hull', () => {
    const perf = computeShipPerformance([{ type: 'wood' }, { type: 'lift' }]);
    expect(perf.engines).toBe(0);
    expect(perf.maxSpeed).toBe(0);
  });

  test('heavy armor can zero out a single engine', () => {
    const armor = Array.from({ length: 30 }, () => ({ type: 'armor' }));
    const perf = computeShipPerformance([{ type: 'engine' }, ...armor]);
    expect(perf.maxSpeed).toBe(0);
  });

  test('floaty lift ship is faster than armored with same engines', () => {
    const engines = [{ type: 'engine' }, { type: 'engine' }];
    const floaty = computeShipPerformance([
      ...engines,
      ...Array.from({ length: 20 }, () => ({ type: 'lift' }))
    ]);
    const armored = computeShipPerformance([
      ...engines,
      ...Array.from({ length: 20 }, () => ({ type: 'armor' }))
    ]);
    expect(floaty.maxSpeed).toBeGreaterThan(armored.maxSpeed);
  });
});
