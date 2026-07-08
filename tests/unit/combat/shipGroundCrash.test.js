import { checkShipGroundCrash, getLowestShipY } from '../../../src/combat/shipCombat.js';
import { GROUND_CRASH_Y } from '../../../src/combat/shipCombatConfig.js';

describe('checkShipGroundCrash', () => {
  function makeShip({ y = 3, sinkState = 'lift', isSinking = true, lowestBlockY = -1 } = {}) {
    return {
      isSinking,
      sinkState,
      isDestroyed: false,
      position: { x: 0, y, z: 0 },
      blockManager: {
        blocks: [{ position: { x: 0, y: lowestBlockY, z: 0 } }]
      }
    };
  }

  test('detects ground impact during lift sink', () => {
    const ship = makeShip({ y: 2, lowestBlockY: 0 });
    expect(getLowestShipY(ship)).toBe(2);
    expect(checkShipGroundCrash(ship)).toBe(true);
  });

  test('detects ground impact during death sink', () => {
    const ship = makeShip({ y: 1.5, sinkState: 'death', lowestBlockY: 0 });
    expect(checkShipGroundCrash(ship)).toBe(true);
  });

  test('ignores ships that are not sinking', () => {
    const ship = makeShip({ y: 0, isSinking: false });
    expect(checkShipGroundCrash(ship)).toBe(false);
  });

  test('ignores ships still above crash altitude', () => {
    const ship = makeShip({ y: GROUND_CRASH_Y + 2, lowestBlockY: 0 });
    expect(checkShipGroundCrash(ship)).toBe(false);
  });
});
