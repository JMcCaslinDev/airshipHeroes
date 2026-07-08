/**
 * Engine boost — Shift in ship mode: 2× accel for up to 5s, then recharge.
 */

export const BOOST_DURATION = 5;
export const BOOST_RECHARGE = 12;
export const BOOST_ACCEL_MULT = 2;
export const BOOST_FLAME_SCALE = 1.65;

/**
 * @param {Object} ship
 */
export function ensureShipBoost(ship) {
  if (!ship) {
    return null;
  }
  if (!ship.boost) {
    ship.boost = {
      active: false,
      remaining: 0,
      charge: 1, // 0–1, full = ready
      windEl: null
    };
  }
  return ship.boost;
}

/**
 * @param {Object} ship
 * @param {number} deltaTime
 * @param {boolean} wantBoost hold sprint + thrusting
 */
export function updateShipBoost(ship, deltaTime, wantBoost) {
  const boost = ensureShipBoost(ship);
  if (!boost) {
    return;
  }

  if (boost.active) {
    boost.remaining -= deltaTime;
    if (boost.remaining <= 0 || !wantBoost) {
      // Early release keeps leftover charge; full burn empties the tank
      boost.charge = boost.remaining > 0
        ? boost.remaining / BOOST_DURATION
        : 0;
      boost.active = false;
      boost.remaining = 0;
    }
  } else if (wantBoost && boost.charge >= 1) {
    boost.active = true;
    boost.remaining = BOOST_DURATION;
  } else if (!boost.active && boost.charge < 1) {
    boost.charge = Math.min(1, boost.charge + deltaTime / BOOST_RECHARGE);
  }

  ship.boostActive = boost.active;
  syncBoostWind(boost);
}

export function getBoostAccelMultiplier(ship) {
  return ship?.boost?.active ? BOOST_ACCEL_MULT : 1;
}

function syncBoostWind(boost) {
  if (typeof document === 'undefined') {
    return;
  }
  if (boost.active) {
    if (!boost.windEl) {
      const el = document.createElement('div');
      el.className = 'boost-wind-overlay';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      boost.windEl = el;
    }
  } else if (boost.windEl) {
    boost.windEl.remove();
    boost.windEl = null;
  }
}

export function disposeShipBoost(ship) {
  const boost = ship?.boost;
  if (boost?.windEl) {
    boost.windEl.remove();
    boost.windEl = null;
  }
}
