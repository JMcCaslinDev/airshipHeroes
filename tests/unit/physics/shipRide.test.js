import {
  shouldDetachFromDeck,
  inheritShipExitVelocity
} from '../../../src/physics/shipRide.js';

describe('shipRide', () => {
  test('stays attached while above nearby deck', () => {
    expect(shouldDetachFromDeck({ grounded: false, aboveDeck: true, motionY: -0.1 })).toBe(false);
  });

  test('detaches when falling clear of deck', () => {
    expect(shouldDetachFromDeck({ grounded: false, aboveDeck: false, motionY: -0.1 })).toBe(true);
  });

  test('does not detach while jumping upward', () => {
    expect(shouldDetachFromDeck({ grounded: false, aboveDeck: false, motionY: 0.4 })).toBe(false);
  });

  test('exit velocity is ship plus walk', () => {
    expect(inheritShipExitVelocity({ x: 5, z: 0 }, { x: 1, z: 2 })).toEqual({ x: 6, z: 2 });
  });
});
