import {
  updateShipBoost,
  getBoostAccelMultiplier,
  BOOST_DURATION,
  BOOST_ACCEL_MULT,
  ensureShipBoost
} from '../../../src/physics/shipBoost.js';

describe('shipBoost', () => {
  function makeShip() {
    return { controls: { boost: true, forward: true } };
  }

  test('activates for BOOST_DURATION then needs recharge', () => {
    const ship = makeShip();
    updateShipBoost(ship, 0.016, true);
    expect(ship.boost.active).toBe(true);
    expect(getBoostAccelMultiplier(ship)).toBe(BOOST_ACCEL_MULT);

    updateShipBoost(ship, BOOST_DURATION + 0.1, true);
    expect(ship.boost.active).toBe(false);
    expect(ship.boost.charge).toBe(0);
    expect(getBoostAccelMultiplier(ship)).toBe(1);

    // Can't re-fire until full
    updateShipBoost(ship, 0.1, true);
    expect(ship.boost.active).toBe(false);
  });

  test('releasing boost early keeps leftover charge', () => {
    const ship = makeShip();
    updateShipBoost(ship, 0, true);
    expect(ship.boost.active).toBe(true);
    updateShipBoost(ship, 1, false);
    expect(ship.boost.active).toBe(false);
    expect(ship.boost.charge).toBeCloseTo((BOOST_DURATION - 1) / BOOST_DURATION, 2);
  });

  test('ensureShipBoost initializes charge full', () => {
    const boost = ensureShipBoost({});
    expect(boost.charge).toBe(1);
    expect(boost.active).toBe(false);
  });
});
