import { SPAWN_SPEED_MIN } from './spawnPlacement.js';
import { localFeetToWorld } from '../physics/shipLocalCollision.js';
import { getControlFeetLocal } from '../ships/shipCrew.js';

/** Camera lock / look-ease duration. Cruise boost continues until player takes over. */
export const SPAWN_INTRO_SECONDS = 4;

/**
 * Ship travel is +Z at rotation 0; Three.js look/mesh face −Z at yaw 0.
 * @param {number} shipRotation
 */
export function shipTravelLookYaw(shipRotation = 0) {
  return shipRotation + Math.PI;
}

function getIntroFeetLocal(ship) {
  return getControlFeetLocal(ship);
}

export function lerpAngle(from, to, t) {
  let diff = to - from;
  while (diff > Math.PI) {
    diff -= Math.PI * 2;
  }
  while (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  return from + diff * t;
}

function smoothIntroProgress(intro) {
  const raw = 1 - Math.max(0, intro.remaining) / SPAWN_INTRO_SECONDS;
  return raw * raw * (3 - 2 * raw);
}

/**
 * Keep player on the deck — prefer ship-local mesh parenting so they never drift.
 */
function pinPlayerToShip(player, ship, localFeet) {
  const character = player?.character;
  if (!character) {
    return;
  }

  const world = localFeetToWorld(ship, localFeet.x, localFeet.y, localFeet.z);
  character.position.x = world.x;
  character.position.y = world.y;
  character.position.z = world.z;
  character.velocity.x = 0;
  character.velocity.y = 0;
  character.velocity.z = 0;
  character.isOnGround = true;
  character.isJumping = false;

  // Parent Steve to the ship so he rides with it (visible from spawn)
  if (character.showShipModeOutline) {
    character.showShipModeOutline(world, ship);
  } else if (character.mesh) {
    character.mesh.position.set(world.x, world.y, world.z);
    character.mesh.visible = true;
  }
}

function applyIntroCruise(ship) {
  if (!ship?.velocity) {
    return;
  }
  const heading = ship.rotation ?? 0;
  const shipMax = ship.maxSpeed ?? ship.performance?.maxSpeed;
  let speed = Math.max(
    SPAWN_SPEED_MIN,
    Math.hypot(ship.velocity.x, ship.velocity.z)
  );
  // Don't cruise faster than this hull can go
  if (Number.isFinite(shipMax) && shipMax >= 0) {
    speed = Math.min(speed, shipMax);
  }
  ship.velocity.x = Math.sin(heading) * speed;
  ship.velocity.z = Math.cos(heading) * speed;
  ship.velocity.y = 0;
}

function isBoostControlDown(keys) {
  if (!keys) {
    return false;
  }
  return !!(
    keys.forward
    || keys.backward
    || keys.left
    || keys.right
    || keys.q
    || keys.e
  );
}

/**
 * ponytail: DOM wind + cruise until player press/release thrust; upgrade path: GPU particles.
 */
export function createSpawnIntro(player, ship, onComplete = null) {
  const wind = document.createElement('div');
  wind.className = 'spawn-wind-overlay';
  wind.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wind);

  const lookYaw = shipTravelLookYaw(ship?.rotation ?? 0);
  // Chase cam: behind the ship looking along travel; start offset so orbit swings in
  const startYaw = lookYaw + Math.PI * 0.7;
  const startPitch = 0.7;
  const targetPitch = 0.35;

  return {
    remaining: SPAWN_INTRO_SECONDS,
    boostActive: true,
    sawBoostPress: false,
    unlocked: false,
    player,
    ship,
    wind,
    onComplete,
    localFeet: getIntroFeetLocal(ship),
    startCameraYaw: startYaw,
    startCameraPitch: startPitch,
    targetCameraYaw: lookYaw,
    targetCameraPitch: targetPitch,
    cameraYaw: startYaw,
    cameraPitch: startPitch
  };
}

/**
 * Lock player to deck and ease look toward ship heading during locked intro.
 * @param {Object|null} cameraController ship or player mode controller with setOrbitAngles / setCameraAngles
 */
export function syncSpawnIntroPlayer(intro, cameraController = null) {
  const { player, ship } = intro ?? {};
  if (!player?.character || !ship?.transform) {
    return;
  }

  pinPlayerToShip(player, ship, intro.localFeet);

  const eased = smoothIntroProgress(intro);
  intro.cameraYaw = lerpAngle(intro.startCameraYaw, intro.targetCameraYaw, eased);
  intro.cameraPitch = intro.startCameraPitch
    + (intro.targetCameraPitch - intro.startCameraPitch) * eased;

  // Steve faces travel (ship +Z ↔ look yaw +π)
  const lookYaw = shipTravelLookYaw(ship.rotation ?? 0);
  player.character.rotation = lookYaw;
  if (player.character.mesh) {
    player.character.mesh.rotation.y = lookYaw;
  }

  if (cameraController?.setOrbitAngles) {
    cameraController.setOrbitAngles(intro.cameraPitch, intro.cameraYaw);
  } else if (cameraController?.setCameraAngles) {
    cameraController.setCameraAngles(intro.cameraPitch, intro.cameraYaw);
  } else {
    player.cameraRotation.x = intro.cameraPitch;
    player.cameraRotation.y = intro.cameraYaw;
    cameraController?.updateCamera?.();
  }
}

/** Player is pinned / camera locked (first few seconds). */
export function isSpawnIntroLocked(intro) {
  return !!(intro && intro.remaining > 0);
}

/** Ship still auto-cruising until player press+release thrust. */
export function isSpawnBoostActive(intro) {
  return !!(intro?.boostActive);
}

/** Locked intro OR cruise boost still running. */
export function isSpawnIntroActive(intro) {
  return isSpawnIntroLocked(intro) || isSpawnBoostActive(intro);
}

/**
 * @returns {'locked'|'boost'|false}
 */
export function updateSpawnIntro(intro, deltaTime, keys = null) {
  if (!intro || (!isSpawnIntroLocked(intro) && !isSpawnBoostActive(intro))) {
    return false;
  }

  applyIntroCruise(intro.ship);

  if (isSpawnIntroLocked(intro)) {
    intro.remaining -= deltaTime;
    if (intro.remaining <= 0) {
      intro.remaining = 0;
      if (!intro.unlocked) {
        intro.unlocked = true;
        intro.onComplete?.();
        intro.onComplete = null;
      }
    }
    return 'locked';
  }

  // Boost phase: cruise until player presses then releases a thrust key.
  const thrusting = isBoostControlDown(keys);
  if (thrusting) {
    intro.sawBoostPress = true;
    return 'boost';
  }
  if (intro.sawBoostPress && !thrusting) {
    endSpawnIntro(intro);
    return false;
  }

  applyIntroCruise(intro.ship);
  return 'boost';
}

export function endSpawnIntro(intro) {
  if (!intro) {
    return;
  }
  intro.remaining = 0;
  intro.boostActive = false;
  intro.wind?.remove();
  intro.wind = null;
  if (!intro.unlocked) {
    intro.unlocked = true;
    intro.onComplete?.();
    intro.onComplete = null;
  }
}
