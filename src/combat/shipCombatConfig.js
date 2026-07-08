/** Shared combat tuning — single source for sinking, lift, ram, fire. */

export const MIN_LIFT_RATIO = 0.25;
/** Just under min lift — slow sink, still some forward arc */
export const LIFT_SINK_RATE_MIN = 0.25;
/** Zero lift — fast drop, mostly vertical */
export const LIFT_SINK_RATE_MAX = 2.4;
/** @deprecated use LIFT_SINK_RATE_MIN — kept for older imports */
export const LIFT_SINK_RATE = LIFT_SINK_RATE_MIN;
export const DEATH_SINK_RATE = 2.8;
/** At zero lift, how hard to kill horizontal speed (0–1) */
export const LIFT_SINK_HORIZONTAL_DRAG = 0.96;
export const GROUND_CRASH_Y = 2;

export const BLOCK_MAX_HEALTH = {
  lift: 4,
  wood: 8,
  stone: 12,
  armor: 16,
  engine: 14,
  cannon: 10,
  dispenser: 8,
  redstone: 3,
  control: 100
};

export const FLAMMABLE_TYPES = new Set(['lift', 'wood']);

export const FIRE_SPREAD_INTERVAL = 1.4;
export const FIRE_SPREAD_CHANCE = 0.35;
export const FIRE_BURN_DAMAGE = 1;
export const FIRE_TICK = 0.75;

export const REDSTONE_RANGE = 8;
export const DISPENSER_COOLDOWN = 2.5;
export const DISPENSER_RANGE = 96;

export const RAM_MIN_SPEED = 1.5;
export const RAM_DAMAGE_PER_SPEED = 3.5;
/** Extra damage multiplier per unit of attacker ship weight */
export const RAM_WEIGHT_DAMAGE = 0.55;
export const RAM_ARMOR_DAMAGE_FACTOR = 0.5;
export const RAM_COOLDOWN_SECONDS = 0.75;
/** Fallback hull radius when a ship has no blocks; real radius uses block extents */
export const SHIP_COLLISION_RADIUS = 2;

/** Damaged blocks regenerate after a short delay */
export const BLOCK_HEAL_DELAY = 2.5;
export const BLOCK_HEAL_PER_SECOND = 1.2;

export const DEATH_SPECTATE_SECONDS = 30;
export const SPECTATOR_HEIGHT = 180;

/** airshipwars-style sink visuals — pitch, smoke, block debris on death sink */
export const SINK_MAX_PITCH = 0.38;
export const SINK_PITCH_RATE = 0.18;
export const SINK_SMOKE_INTERVAL = 0.55;
export const SINK_SMOKE_INTERVAL_LIFT = 0.85;
export const SINK_BLOCK_DROP_INTERVAL_DEATH = 0.9;
export const SINK_MIN_BLOCKS = 4;
