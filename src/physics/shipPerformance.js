/**
 * Ship speed from engines vs block weight.
 * maxSpeed = max(0, engines * ENGINE_SPEED - totalWeight)
 */

export const ENGINE_SPEED_BONUS = 5;

export const BLOCK_WEIGHT = {
  engine: 0,
  lift: 0.1,
  armor: 0.2,
  redstone: 0,
  dispenser: 0.1,
  control: 0.1,
  steeringWheel: 0.1,
  steering: 0.1,
  wood: 0.1,
  stone: 0.1,
  cannon: 0.1
};

export const DEFAULT_BLOCK_WEIGHT = 0.1;

/** Blimp-like accel (units/s²) — slow ramp to max */
export const SHIP_BASE_ACCEL = 0.9;
export const SHIP_ACCEL_PER_ENGINE = 0.12;
export const SHIP_REVERSE_FACTOR = 0.55;

/** Cruise is half of absolute max; boost unlocks the upper half */
export const CRUISE_SPEED_FACTOR = 0.5;

/** Coasting / post-boost bleed ≈ 1 mph per second (gradual) */
export const SPEED_TO_MPH = 2.237;
export const SHIP_DECEL_MPH_PER_SEC = 1;
export const SHIP_DECEL = SHIP_DECEL_MPH_PER_SEC / SPEED_TO_MPH;

/** Display conversion (same as HUD) */
export function mphToUnits(mph) {
  return (mph ?? 0) / SPEED_TO_MPH;
}

export function getBlockWeight(type) {
  const key = type?.toLowerCase?.() ?? '';
  return BLOCK_WEIGHT[key] ?? DEFAULT_BLOCK_WEIGHT;
}

/**
 * @param {Array<{type: string}>|null} blocks
 * @returns {{ engines: number, weight: number, maxSpeed: number, accel: number, reverseMaxSpeed: number }}
 */
export function computeShipPerformance(blocks) {
  const list = blocks ?? [];
  let engines = 0;
  let weight = 0;

  for (const block of list) {
    const type = block?.type ?? '';
    if (type === 'engine') {
      engines += 1;
    }
    weight += getBlockWeight(type);
  }

  const maxSpeed = Math.max(0, engines * ENGINE_SPEED_BONUS - weight);
  const cruiseMaxSpeed = Math.round(maxSpeed * CRUISE_SPEED_FACTOR * 100) / 100;
  const accel = SHIP_BASE_ACCEL + engines * SHIP_ACCEL_PER_ENGINE;

  return {
    engines,
    weight: Math.round(weight * 100) / 100,
    maxSpeed: Math.round(maxSpeed * 100) / 100,
    cruiseMaxSpeed,
    boostMaxSpeed: Math.round(maxSpeed * 100) / 100,
    accel: Math.round(accel * 100) / 100,
    reverseMaxSpeed: Math.round(cruiseMaxSpeed * SHIP_REVERSE_FACTOR * 100) / 100
  };
}

export function computeShipPerformanceFromShip(ship) {
  return computeShipPerformance(ship?.blockManager?.blocks ?? ship?.blocks ?? []);
}

export function formatSpeedMph(unitsPerSec) {
  return Math.round((unitsPerSec ?? 0) * SPEED_TO_MPH * 10) / 10;
}

export function formatPerformanceSummary(perf) {
  if (!perf) {
    return 'No engines';
  }
  return `${perf.engines} eng · wt ${perf.weight} · cruise ${formatSpeedMph(perf.cruiseMaxSpeed)} / max ${formatSpeedMph(perf.maxSpeed)} mph`;
}
