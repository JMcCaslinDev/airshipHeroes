/**
 * Minecraft Java player movement (1 block = 1 world unit).
 * Collision: per-axis AABB sweep like Entity.collide() / Shapes.collide().
 */

export const PLAYER_SPEED = {
  WALK: 4.317,
  SPRINT: 5.612,
  SNEAK: 1.295
};

export const MC_TICK = 1 / 20;
export const MC_JUMP_MOTION = 0.42;
export const MC_GRAVITY_PER_TICK = 0.08;
export const PLAYER_JUMP_HEIGHT = 1.2522;
export const PLAYER_EYE_HEIGHT = 1.62;
export const PLAYER_SNEAK_EYE_HEIGHT = 1.27;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_HEIGHT_SNEAK = 1.5;
export const PLAYER_HALF_WIDTH = 0.3;
export const FEET_HALF_WIDTH = PLAYER_HALF_WIDTH;
export const GROUND_SNAP_GAP = 0.25;

const EPS = 1e-3;

/** Feet on this block's top — skip horizontal clip/depenetrate (deck seams, hull below deck). */
function isWalkableFloorTop(entity, box) {
  const feetY = entity.min.y;
  return feetY >= box.max.y - GROUND_SNAP_GAP && feetY <= box.max.y + GROUND_SNAP_GAP;
}

/** Ground checks use center — full foot width extends past block edges and feels like ghost floors. */
function feetCenterOverBlock(x, z, box) {
  return x > box.min.x && x < box.max.x && z > box.min.z && z < box.max.z;
}

/**
 * Steve AABB from feet position (bottom center).
 */
export function getPlayerBounds(x, feetY, z, sneaking = false) {
  const height = sneaking ? PLAYER_HEIGHT_SNEAK : PLAYER_HEIGHT;
  return {
    min: { x: x - PLAYER_HALF_WIDTH, y: feetY, z: z - PLAYER_HALF_WIDTH },
    max: { x: x + PLAYER_HALF_WIDTH, y: feetY + height, z: z + PLAYER_HALF_WIDTH }
  };
}

export function boundsCenter(bounds) {
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: bounds.min.y,
    z: (bounds.min.z + bounds.max.z) / 2
  };
}

function moveBounds(bounds, dx, dy, dz) {
  return {
    min: { x: bounds.min.x + dx, y: bounds.min.y + dy, z: bounds.min.z + dz },
    max: { x: bounds.max.x + dx, y: bounds.max.y + dy, z: bounds.max.z + dz }
  };
}

/** Full body or XZ footprint when feet are above a short wall. */
function depenetrateMode(bounds, box) {
  const hx = bounds.min.x < box.max.x - EPS && bounds.max.x > box.min.x + EPS;
  const hz = bounds.min.z < box.max.z - EPS && bounds.max.z > box.min.z + EPS;
  if (!hx || !hz) {
    return null;
  }
  const hy = bounds.min.y < box.max.y + EPS && bounds.max.y > box.min.y + EPS;
  if (hy) {
    return 'full';
  }
  if (bounds.min.y >= box.max.y - EPS) {
    return 'footprint';
  }
  return null;
}

/** Vanilla clip_x — clip intended movement before hitting obstacle. */
function clipX(entity, obstacle, dx) {
  if (entity.max.y <= obstacle.min.y + EPS
      || isWalkableFloorTop(entity, obstacle)
      || obstacle.max.y < entity.min.y - EPS) {
    return dx;
  }
  if (entity.max.z <= obstacle.min.z + EPS || entity.min.z >= obstacle.max.z - EPS) {
    return dx;
  }
  if (dx > 0 && entity.max.x <= obstacle.min.x + EPS) {
    const maxMove = obstacle.min.x - entity.max.x;
    if (maxMove < dx) {
      return maxMove;
    }
  } else if (dx < 0 && entity.min.x >= obstacle.max.x - EPS) {
    const maxMove = obstacle.max.x - entity.min.x;
    if (maxMove > dx) {
      return maxMove;
    }
  }
  return dx;
}

function clipY(entity, obstacle, dy) {
  if (entity.max.x <= obstacle.min.x + EPS || entity.min.x >= obstacle.max.x - EPS) {
    return dy;
  }
  if (entity.max.z <= obstacle.min.z + EPS || entity.min.z >= obstacle.max.z - EPS) {
    return dy;
  }
  if (dy > 0 && entity.max.y <= obstacle.min.y + EPS) {
    const maxMove = obstacle.min.y - entity.max.y;
    if (maxMove < dy) {
      return maxMove;
    }
  } else if (dy < 0 && entity.min.y >= obstacle.max.y - EPS) {
    const maxMove = obstacle.max.y - entity.min.y;
    if (maxMove > dy) {
      return maxMove;
    }
  }
  return dy;
}

function clipZ(entity, obstacle, dz) {
  if (entity.max.x <= obstacle.min.x + EPS || entity.min.x >= obstacle.max.x - EPS) {
    return dz;
  }
  if (entity.max.y <= obstacle.min.y + EPS
      || isWalkableFloorTop(entity, obstacle)
      || obstacle.max.y < entity.min.y - EPS) {
    return dz;
  }
  if (dz > 0 && entity.max.z <= obstacle.min.z + EPS) {
    const maxMove = obstacle.min.z - entity.max.z;
    if (maxMove < dz) {
      return maxMove;
    }
  } else if (dz < 0 && entity.min.z >= obstacle.max.z - EPS) {
    const maxMove = obstacle.max.z - entity.min.z;
    if (maxMove > dz) {
      return maxMove;
    }
  }
  return dz;
}

/**
 * Minecraft axis order: Y first, then X/Z by larger movement magnitude.
 */
export function collideMovement(bounds, dx, dy, dz, boxes) {
  if (!boxes.length) {
    return { dx, dy, dz, onGround: false, hitCeiling: false };
  }

  let resolvedDy = dy;
  for (const box of boxes) {
    resolvedDy = clipY(bounds, box, resolvedDy);
  }
  const afterY = moveBounds(bounds, 0, resolvedDy, 0);

  let resolvedDx;
  let resolvedDz;

  if (Math.abs(dx) >= Math.abs(dz)) {
    resolvedDx = dx;
    for (const box of boxes) {
      resolvedDx = clipX(afterY, box, resolvedDx);
    }
    const afterYX = moveBounds(afterY, resolvedDx, 0, 0);
    resolvedDz = dz;
    for (const box of boxes) {
      resolvedDz = clipZ(afterYX, box, resolvedDz);
    }
  } else {
    resolvedDz = dz;
    for (const box of boxes) {
      resolvedDz = clipZ(afterY, box, resolvedDz);
    }
    const afterYZ = moveBounds(afterY, 0, 0, resolvedDz);
    resolvedDx = dx;
    for (const box of boxes) {
      resolvedDx = clipX(afterYZ, box, resolvedDx);
    }
  }

  return {
    dx: resolvedDx,
    dy: resolvedDy,
    dz: resolvedDz,
    onGround: dy < 0 && resolvedDy > dy + EPS,
    hitCeiling: dy > 0 && resolvedDy < dy - EPS
  };
}

function resolveHorizontalAxis(center, playerMin, playerMax, boxMin, boxMax, halfWidth) {
  if (playerMax > boxMax && playerMin < boxMax) {
    return boxMax - halfWidth;
  }
  if (playerMin < boxMin && playerMax > boxMin) {
    return boxMin - halfWidth;
  }
  const pushLow = playerMax - boxMin;
  const pushHigh = boxMax - playerMin;
  return center + (pushLow < pushHigh ? -pushLow : pushHigh);
}

function feetOnBlockTopStrict(x, feetY, z, box) {
  const overX = x + FEET_HALF_WIDTH > box.min.x && x - FEET_HALF_WIDTH < box.max.x;
  const overZ = z + FEET_HALF_WIDTH > box.min.z && z - FEET_HALF_WIDTH < box.max.z;
  if (!overX || !overZ) {
    return false;
  }
  return feetY >= box.max.y - 0.05 && feetY <= box.max.y + 0.05;
}

function shouldSkipDepenetrate(bounds, box, px, py, pz) {
  if (!feetOnBlockTopStrict(px, py, pz, box)) {
    return false;
  }
  const hw = PLAYER_HALF_WIDTH;
  if (px - hw >= box.min.x - EPS && px + hw <= box.max.x + EPS
      && pz - hw >= box.min.z - EPS && pz + hw <= box.max.z + EPS) {
    return true;
  }
  if (bounds.max.x > box.max.x + EPS && bounds.min.x < box.max.x - EPS) {
    return true;
  }
  if (bounds.max.z > box.max.z + EPS && bounds.min.z < box.max.z - EPS) {
    return true;
  }
  if (bounds.min.x < box.min.x - EPS && bounds.max.x > box.min.x + EPS) {
    return false;
  }
  if (bounds.min.z < box.min.z - EPS && bounds.max.z > box.min.z + EPS) {
    return false;
  }
  return false;
}

/**
 * Push out of blocks when already overlapping (bump + jump clip). Floor-top overlap is OK.
 */
export function depenetratePosition(x, feetY, z, boxes, sneaking = false) {
  const hw = PLAYER_HALF_WIDTH;
  const height = sneaking ? PLAYER_HEIGHT_SNEAK : PLAYER_HEIGHT;
  let px = x;
  let py = feetY;
  let pz = z;

  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    let bounds = getPlayerBounds(px, py, pz, sneaking);

    for (const box of boxes) {
      bounds = getPlayerBounds(px, py, pz, sneaking);
      // Hull under deck, or floor we're standing on — not a side wall
      if (isWalkableFloorTop(bounds, box) || box.max.y < bounds.min.y - EPS) {
        continue;
      }
      const mode = depenetrateMode(bounds, box);
      if (!mode) {
        continue;
      }
      if (shouldSkipDepenetrate(bounds, box, px, py, pz)) {
        continue;
      }

      const overlapX = Math.min(bounds.max.x, box.max.x) - Math.max(bounds.min.x, box.min.x);
      const overlapY = Math.min(bounds.max.y, box.max.y) - Math.max(bounds.min.y, box.min.y);
      const overlapZ = Math.min(bounds.max.z, box.max.z) - Math.max(bounds.min.z, box.min.z);
      const horizontalOnly = mode === 'footprint';

      if (overlapX > EPS && (horizontalOnly || overlapY <= EPS || overlapX <= overlapY)
          && (overlapZ <= EPS || overlapX <= overlapZ)) {
        px = resolveHorizontalAxis(px, bounds.min.x, bounds.max.x, box.min.x, box.max.x, hw);
        moved = true;
      } else if (overlapZ > EPS && (horizontalOnly || overlapY <= EPS || overlapZ <= overlapY)) {
        pz = resolveHorizontalAxis(pz, bounds.min.z, bounds.max.z, box.min.z, box.max.z, hw);
        moved = true;
      } else if (!horizontalOnly && overlapY > EPS) {
        if (py + height / 2 < (box.min.y + box.max.y) / 2) {
          py = box.min.y - height;
        } else {
          py = box.max.y;
        }
        moved = true;
      }
    }

    if (!moved) {
      break;
    }
  }

  return { x: px, y: py, z: pz };
}

/**
 * Apply movement with MC collision. Returns new feet position + ground flags.
 */
export function movePlayer(x, feetY, z, dx, dy, dz, boxes, sneaking = false) {
  const bounds = getPlayerBounds(x, feetY, z, sneaking);
  const collision = collideMovement(bounds, dx, dy, dz, boxes);

  let nx = x + collision.dx;
  let ny = feetY + collision.dy;
  let nz = z + collision.dz;

  const clippedX = Math.abs(dx) > EPS && Math.abs(collision.dx) < Math.abs(dx) - EPS;
  const clippedZ = Math.abs(dz) > EPS && Math.abs(collision.dz) < Math.abs(dz) - EPS;
  const shouldDepen = Math.abs(dy) > EPS || clippedX || clippedZ;

  if (shouldDepen) {
    const depen = depenetratePosition(nx, ny, nz, boxes, sneaking);
    nx = depen.x;
    ny = depen.y;
    nz = depen.z;
  }

  return {
    x: nx,
    y: ny,
    z: nz,
    onGround: collision.onGround,
    hitCeiling: collision.hitCeiling
  };
}

export function feetOnBlockTop(x, feetY, z, box) {
  if (!feetCenterOverBlock(x, z, box)) {
    return false;
  }
  return feetY >= box.max.y - GROUND_SNAP_GAP && feetY <= box.max.y + GROUND_SNAP_GAP;
}

export function nearestBlockTopBelow(x, feetY, z, boxes) {
  let best = null;
  for (const box of boxes) {
    if (!feetCenterOverBlock(x, z, box)) {
      continue;
    }
    if (box.max.y > feetY + GROUND_SNAP_GAP) {
      continue;
    }
    if (best === null || box.max.y > best) {
      best = box.max.y;
    }
  }
  return best;
}

/** Probe one MC tick downward — matches vanilla onGround when standing still. */
export function probeOnGround(x, feetY, z, boxes, sneaking = false) {
  const bounds = getPlayerBounds(x, feetY, z, sneaking);
  const probeDy = -0.05;
  const result = collideMovement(bounds, 0, probeDy, 0, boxes);
  return result.dy > probeDy + EPS;
}

export function getPlayerMoveSpeed({ sneaking = false, sprinting = false } = {}) {
  if (sneaking) {
    return PLAYER_SPEED.SNEAK;
  }
  if (sprinting) {
    return PLAYER_SPEED.SPRINT;
  }
  return PLAYER_SPEED.WALK;
}

export function stepMinecraftVertical(motionY, onGround, jumpPressed) {
  return integrateVertical(motionY, onGround, jumpPressed, MC_TICK);
}

export function integrateVertical(motionY, onGround, jumpPressed, deltaTime) {
  const ticks = deltaTime / MC_TICK;
  let jumped = false;

  if (onGround) {
    motionY = 0;
    if (jumpPressed) {
      motionY = MC_JUMP_MOTION;
      jumped = true;
    }
  }

  const deltaY = motionY * ticks;

  if (!onGround || jumped) {
    motionY -= MC_GRAVITY_PER_TICK * ticks;
  }

  return { motionY, deltaY, jumped };
}

export function simulateSmoothJumpHeight(steps = 400) {
  let motionY = 0;
  let y = 0;
  let maxY = 0;
  let jumped = false;
  const dt = MC_TICK / 4;

  for (let i = 0; i < steps; i++) {
    const onGround = y <= 0 && motionY <= 0;
    if (y < 0) {
      y = 0;
    }
    const step = integrateVertical(motionY, onGround, onGround && !jumped, dt);
    if (step.jumped) {
      jumped = true;
    }
    motionY = step.motionY;
    y += step.deltaY;
    maxY = Math.max(maxY, y);
    if (y <= 0 && motionY < 0 && jumped) {
      break;
    }
  }

  return maxY;
}

export function simulateMinecraftJumpHeight() {
  let motionY = 0;
  let y = 0;
  let maxY = 0;

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
