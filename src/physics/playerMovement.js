/**
 * Minecraft Java movement (1 block = 1 world unit).
 * Vertical motion uses per-tick physics like LivingEntity.
 */

export const PLAYER_SPEED = {
  WALK: 4.317,
  SPRINT: 5.612,
  SNEAK: 1.295
};

/** 20 ticks per second */
export const MC_TICK = 1 / 20;

/** Upward motion on jump (blocks/tick). */
export const MC_JUMP_MOTION = 0.42;

/** Gravity subtracted from motionY each airborne tick (blocks/tick). */
export const MC_GRAVITY_PER_TICK = 0.08;

export const PLAYER_JUMP_HEIGHT = 1.2522;

export const PLAYER_EYE_HEIGHT = 1.62;
export const PLAYER_SNEAK_EYE_HEIGHT = 1.27;

/** Minecraft Steve hitbox (1 block = 1 world unit). */
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_HEIGHT_SNEAK = 1.5;
export const PLAYER_HALF_WIDTH = 0.3;

/** Horizontal footprint half-width for ground checks. */
export const FEET_HALF_WIDTH = PLAYER_HALF_WIDTH;

/** Max gap between feet and block top to count as standing (blocks). */
export const GROUND_SNAP_GAP = 0.25;

/**
 * Steve AABB from feet position.
 */
export function getPlayerBounds(x, feetY, z, sneaking = false) {
  const height = sneaking ? PLAYER_HEIGHT_SNEAK : PLAYER_HEIGHT;
  return {
    min: { x: x - PLAYER_HALF_WIDTH, y: feetY, z: z - PLAYER_HALF_WIDTH },
    max: { x: x + PLAYER_HALF_WIDTH, y: feetY + height, z: z + PLAYER_HALF_WIDTH }
  };
}

function aabbOverlap(aMin, aMax, bMin, bMax, epsilon = 0.001) {
  return (
    aMin.x < bMax.x + epsilon && aMax.x > bMin.x - epsilon &&
    aMin.y < bMax.y + epsilon && aMax.y > bMin.y - epsilon &&
    aMin.z < bMax.z + epsilon && aMax.z > bMin.z - epsilon
  );
}

/**
 * Push Steve hitbox out of block boxes. ponytail: O(passes * blocks); fine for ship-sized block counts.
 * @param {'xyz'|'xz'|'y'} axes - which axes to resolve (Minecraft splits horizontal vs vertical)
 */
export function resolvePlayerCollisions(x, feetY, z, boxes, sneaking, motionY, { maxPasses = 6, axes = 'xyz' } = {}) {
  const height = sneaking ? PLAYER_HEIGHT_SNEAK : PLAYER_HEIGHT;
  const hw = PLAYER_HALF_WIDTH;
  let px = x;
  let py = feetY;
  let pz = z;
  let newMotionY = motionY;
  let onGround = false;
  let hitCeiling = false;

  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;

    for (const box of boxes) {
      const eps = 0.001;
      const playerMin = { x: px - hw, y: py, z: pz - hw };
      const playerMax = { x: px + hw, y: py + height, z: pz + hw };

      if (!aabbOverlap(playerMin, playerMax, box.min, box.max)) {
        continue;
      }

      const overlapX = Math.min(playerMax.x, box.max.x) - Math.max(playerMin.x, box.min.x);
      const overlapY = Math.min(playerMax.y, box.max.y) - Math.max(playerMin.y, box.min.y);
      const overlapZ = Math.min(playerMax.z, box.max.z) - Math.max(playerMin.z, box.min.z);

      if (overlapX <= eps && overlapZ <= eps) {
        continue;
      }

      const hasY = overlapY > eps;

      const resolveX = axes === 'xyz' || axes === 'xz';
      const resolveY = axes === 'xyz' || axes === 'y';
      const resolveZ = axes === 'xyz' || axes === 'xz';

      // Horizontal: skip floor/deck blocks we're standing on.
      if (axes === 'xz' && feetOnBlockTop(px, py, pz, box)) {
        continue;
      }

      if (resolveY && !hasY) {
        continue;
      }

      const candidates = [];
      if (resolveX) {
        candidates.push({ axis: 'x', overlap: overlapX });
      }
      if (resolveY && hasY) {
        candidates.push({ axis: 'y', overlap: overlapY });
      }
      if (resolveZ) {
        candidates.push({ axis: 'z', overlap: overlapZ });
      }
      candidates.sort((a, b) => a.overlap - b.overlap);
      const hit = candidates[0];
      if (!hit) {
        continue;
      }

      if (hit.axis === 'x') {
        const blockCenterX = (box.min.x + box.max.x) / 2;
        px += px > blockCenterX ? overlapX : -overlapX;
        moved = true;
      } else if (hit.axis === 'y') {
        const blockCenterY = (box.min.y + box.max.y) / 2;
        const playerCenterY = py + height / 2;
        if (playerCenterY >= blockCenterY) {
          py = box.max.y;
          if (newMotionY <= 0) {
            newMotionY = 0;
            onGround = true;
          }
        } else {
          py = box.min.y - height;
          if (newMotionY > 0) {
            newMotionY = 0;
            hitCeiling = true;
          }
        }
        moved = true;
      } else {
        const blockCenterZ = (box.min.z + box.max.z) / 2;
        pz += pz > blockCenterZ ? overlapZ : -overlapZ;
        moved = true;
      }
    }

    if (!moved) {
      break;
    }
  }

  return { x: px, y: py, z: pz, motionY: newMotionY, onGround, hitCeiling };
}

/**
 * True when feet are over a block top within Minecraft step height.
 * @param {number} x
 * @param {number} feetY
 * @param {number} z
 * @param {{ min: {x:number,y:number,z:number}, max: {x:number,y:number,z:number} }} box
 */
export function feetOnBlockTop(x, feetY, z, box) {
  const overX = x + FEET_HALF_WIDTH > box.min.x && x - FEET_HALF_WIDTH < box.max.x;
  const overZ = z + FEET_HALF_WIDTH > box.min.z && z - FEET_HALF_WIDTH < box.max.z;
  if (!overX || !overZ) {
    return false;
  }
  return feetY >= box.max.y - GROUND_SNAP_GAP && feetY <= box.max.y + GROUND_SNAP_GAP;
}

/** Feet centered on a block top — skip sideways push against the floor we're on. */
export function isStandingOnBlockTop(x, feetY, z, box) {
  const inset = 0.05;
  const feetInsideX = x > box.min.x + inset && x < box.max.x - inset;
  const feetInsideZ = z > box.min.z + inset && z < box.max.z - inset;
  return feetInsideX && feetInsideZ && feetOnBlockTop(x, feetY, z, box);
}

/**
 * Highest block top under the feet column within step height, or null.
 */
export function nearestBlockTopBelow(x, feetY, z, boxes) {
  let best = null;
  for (const box of boxes) {
    const overX = x + FEET_HALF_WIDTH > box.min.x && x - FEET_HALF_WIDTH < box.max.x;
    const overZ = z + FEET_HALF_WIDTH > box.min.z && z - FEET_HALF_WIDTH < box.max.z;
    // Include block tops slightly above feet (feet sunk into block volume).
    if (!overX || !overZ || box.max.y > feetY + 0.55) {
      continue;
    }
    if (best === null || box.max.y > best) {
      best = box.max.y;
    }
  }
  return best;
}

/**
 * @param {{ sneaking?: boolean, sprinting?: boolean }} modifiers
 * @returns {number}
 */
export function getPlayerMoveSpeed({ sneaking = false, sprinting = false } = {}) {
  if (sneaking) {
    return PLAYER_SPEED.SNEAK;
  }
  if (sprinting) {
    return PLAYER_SPEED.SPRINT;
  }
  return PLAYER_SPEED.WALK;
}

/**
 * One Minecraft vertical tick (matches Java jump arc).
 * @param {number} motionY - blocks/tick
 * @param {boolean} onGround
 * @param {boolean} jumpPressed
 * @returns {{ motionY: number, deltaY: number, jumped: boolean }}
 */
export function stepMinecraftVertical(motionY, onGround, jumpPressed) {
  let jumped = false;

  if (onGround) {
    motionY = 0;
    if (jumpPressed) {
      motionY = MC_JUMP_MOTION;
      jumped = true;
    }
  }

  const deltaY = motionY;

  if (!onGround || jumped) {
    motionY -= MC_GRAVITY_PER_TICK;
  }

  return { motionY, deltaY, jumped };
}

/**
 * Max height from discrete MC jump simulation.
 * @returns {number}
 */
export function simulateMinecraftJumpHeight() {
  let motionY = 0;
  let y = 0;
  let maxY = 0;

  // First tick: jump from ground
  motionY = MC_JUMP_MOTION;
  y += motionY;
  maxY = Math.max(maxY, y);
  motionY -= MC_GRAVITY_PER_TICK;

  for (let i = 0; i < 40; i++) {
    y += motionY;
    maxY = Math.max(maxY, y);
    if (y <= 0 && motionY < 0) {
      break;
    }
    motionY -= MC_GRAVITY_PER_TICK;
  }

  return maxY;
}
