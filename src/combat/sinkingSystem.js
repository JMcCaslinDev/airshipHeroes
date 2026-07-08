/**
 * Sinking visuals + block debris — ports airshipwars intent (handleSinking was never implemented there).
 */

import * as THREE from 'three';
import {
  SINK_BLOCK_DROP_INTERVAL_DEATH,
  SINK_MAX_PITCH,
  SINK_MIN_BLOCKS,
  SINK_PITCH_RATE,
  SINK_SMOKE_INTERVAL,
  SINK_SMOKE_INTERVAL_LIFT
} from './shipCombatConfig.js';
import { recalculateShipHealth, updateSinkingState } from './shipCombat.js';

function resetSinkPitch(ship) {
  ship.sinkingTiltAmount = 0;
  ship.sinkingRollAmount = 0;
  if (ship.group) {
    ship.group.rotation.x = 0;
  }
}

function pickSmokeBlock(ship) {
  const blocks = ship.blockManager?.blocks;
  if (!blocks?.length) {
    return null;
  }
  return blocks[Math.floor(Math.random() * blocks.length)];
}

/** ponytail: denser Points smoke — upgrade path: pooled particle system */
export function spawnSinkSmoke(ship, scene, intensity = 1) {
  if (!scene || !ship?.group) {
    return;
  }

  const block = pickSmokeBlock(ship);
  if (!block) {
    return;
  }

  const worldPos = ship.getBlockWorldPosition(block);
  const count = Math.round(18 * intensity);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2.2;
    positions[i * 3 + 1] = Math.random() * 0.8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
    const shade = 0.15 + Math.random() * 0.35;
    const heat = Math.random() > 0.7 ? 0.35 : 0;
    colors[i * 3] = shade + heat;
    colors[i * 3 + 1] = shade * 0.85;
    colors[i * 3 + 2] = shade * 0.7;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.55 + Math.random() * 0.25,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false
  });

  const particles = new THREE.Points(geometry, material);
  particles.position.set(worldPos.x, worldPos.y + 0.4, worldPos.z);
  scene.add(particles);

  const debris = {
    mesh: particles,
    life: 3.4,
    velocity: {
      x: (Math.random() - 0.5) * 0.55,
      y: 0.55 + Math.random() * 0.45,
      z: (Math.random() - 0.5) * 0.55
    }
  };
  if (!ship._sinkEffects) {
    ship._sinkEffects = [];
  }
  ship._sinkEffects.push(debris);
}

function pickTopBlock(ship) {
  const blocks = ship.blockManager?.blocks?.filter((b) => b.type !== 'control') ?? [];
  if (!blocks.length) {
    return null;
  }
  const maxY = Math.max(...blocks.map((b) => b.position.y));
  const topBlocks = blocks.filter((b) => b.position.y >= maxY - 1);
  return topBlocks[Math.floor(Math.random() * topBlocks.length)];
}

/** Detach a block mesh and let it fall — block-wise sink animation on death */
export function dropSinkingBlock(ship, scene) {
  const block = pickTopBlock(ship);
  if (!block?.mesh || !scene) {
    return;
  }

  const worldPos = ship.getBlockWorldPosition(block);
  const mesh = block.mesh.clone();
  mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
  mesh.rotation.set(0, ship.rotation ?? 0, 0);
  scene.add(mesh);

  ship.blockManager.removeBlock({ ...block.position });

  const debris = {
    mesh,
    life: 4.5,
    velocity: {
      x: (Math.random() - 0.5) * 1.8,
      y: -0.4 - Math.random() * 1.1,
      z: (Math.random() - 0.5) * 1.8
    },
    angular: {
      x: (Math.random() - 0.5) * 3,
      y: (Math.random() - 0.5) * 3,
      z: (Math.random() - 0.5) * 3
    }
  };
  if (!ship._sinkEffects) {
    ship._sinkEffects = [];
  }
  ship._sinkEffects.push(debris);
  recalculateShipHealth(ship);
  updateSinkingState(ship);
}

function updateSinkEffects(ship, deltaTime, scene) {
  const effects = ship._sinkEffects;
  if (!effects?.length) {
    return;
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    effect.life -= deltaTime;
    if (effect.life <= 0) {
      scene?.remove(effect.mesh);
      effect.mesh.geometry?.dispose?.();
      effect.mesh.material?.dispose?.();
      effects.splice(i, 1);
      continue;
    }

    effect.mesh.position.x += effect.velocity.x * deltaTime;
    effect.mesh.position.y += effect.velocity.y * deltaTime;
    effect.mesh.position.z += effect.velocity.z * deltaTime;
    effect.velocity.y -= 3.2 * deltaTime;

    if (effect.angular) {
      effect.mesh.rotation.x += effect.angular.x * deltaTime;
      effect.mesh.rotation.y += effect.angular.y * deltaTime;
      effect.mesh.rotation.z += effect.angular.z * deltaTime;
    }

    if (effect.mesh.material?.opacity !== undefined) {
      effect.mesh.material.opacity = Math.max(0, effect.life / 3.4) * 0.75;
    }
    if (effect.mesh.material?.size !== undefined) {
      effect.mesh.material.size *= 1 + deltaTime * 0.35;
    }
  }
}

/**
 * airshipwars handleSinking equivalent — pitch, roll, smoke, death-sink block drops.
 */
export function updateShipSinking(ship, deltaTime, scene) {
  if (!ship || ship.isDestroyed) {
    return;
  }

  if (!ship.isSinking) {
    if (ship.sinkingTiltAmount || ship.sinkingRollAmount) {
      resetSinkPitch(ship);
    }
    updateSinkEffects(ship, deltaTime, scene);
    return;
  }

  if (!ship.sinkingStartTime) {
    ship.sinkingStartTime = performance.now();
  }

  const isDeath = ship.sinkState === 'death';
  const zeroLift = (ship.liftRatio ?? 1) <= 0.001;
  const pitchRate = isDeath
    ? SINK_PITCH_RATE * 1.8
    : SINK_PITCH_RATE * (zeroLift ? 1.5 : 0.7);

  ship.sinkingTiltAmount = Math.min(
    SINK_MAX_PITCH * (zeroLift || isDeath ? 1.25 : 1),
    (ship.sinkingTiltAmount ?? 0) + pitchRate * deltaTime
  );

  // Gentle roll wobble while sinking
  ship.sinkingRollAmount = Math.sin((performance.now() - ship.sinkingStartTime) * 0.002)
    * (isDeath || zeroLift ? 0.12 : 0.06);

  if (ship.group) {
    ship.group.rotation.x = ship.sinkingTiltAmount;
    // Preserve bank from flight; add sink roll on top via userData offset if needed
    ship.group.rotation.z = (ship.bankAngle ?? 0) + (ship.sinkingRollAmount ?? 0);
  }

  const smokeInterval = isDeath || zeroLift ? SINK_SMOKE_INTERVAL : SINK_SMOKE_INTERVAL_LIFT;
  ship._sinkSmokeTimer = (ship._sinkSmokeTimer ?? 0) - deltaTime;
  if (ship._sinkSmokeTimer <= 0) {
    ship._sinkSmokeTimer = smokeInterval;
    const bursts = isDeath || zeroLift ? 2 : 1;
    for (let i = 0; i < bursts; i++) {
      spawnSinkSmoke(ship, scene, isDeath || zeroLift ? 1.4 : 1);
    }
  }

  if (
    isDeath
    && (ship.blockManager?.blocks?.length ?? 0) > SINK_MIN_BLOCKS
  ) {
    ship._sinkDropTimer = (ship._sinkDropTimer ?? 0) - deltaTime;
    if (ship._sinkDropTimer <= 0) {
      ship._sinkDropTimer = SINK_BLOCK_DROP_INTERVAL_DEATH;
      dropSinkingBlock(ship, scene);
    }
  }

  updateSinkEffects(ship, deltaTime, scene);
}

export function clearShipSinkEffects(ship, scene) {
  resetSinkPitch(ship);
  ship.sinkingStartTime = 0;
  ship._sinkSmokeTimer = 0;
  ship._sinkDropTimer = 0;

  for (const effect of ship._sinkEffects ?? []) {
    scene?.remove(effect.mesh);
    effect.mesh.geometry?.dispose?.();
    effect.mesh.material?.dispose?.();
  }
  ship._sinkEffects = [];
}
