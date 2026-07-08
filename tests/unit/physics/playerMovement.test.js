/**
 * Minecraft vertical jump physics + swept AABB collision
 */

import {
  stepMinecraftVertical,
  integrateVertical,
  simulateMinecraftJumpHeight,
  simulateSmoothJumpHeight,
  feetOnBlockTop,
  nearestBlockTopBelow,
  movePlayer,
  depenetratePosition,
  collideMovement,
  getPlayerBounds,
  probeOnGround,
  MC_TICK,
  MC_JUMP_MOTION,
  MC_GRAVITY_PER_TICK,
  PLAYER_JUMP_HEIGHT,
  GROUND_SNAP_GAP
} from '../../../src/physics/playerMovement.js';

describe('stepMinecraftVertical', () => {
  test('standing jump reaches ~1.25 blocks', () => {
    const height = simulateMinecraftJumpHeight();
    expect(height).toBeGreaterThan(1.2);
    expect(height).toBeLessThan(1.35);
    expect(height).toBeCloseTo(PLAYER_JUMP_HEIGHT, 0);
  });

  test('one jump per ground contact when holding jump', () => {
    let motionY = 0;
    let y = 0;
    let jumps = 0;

    for (let tick = 0; tick < 3; tick++) {
      const onGround = y <= 0;
      if (y < 0) {
        y = 0;
      }
      const step = stepMinecraftVertical(motionY, onGround, true);
      if (step.jumped) {
        jumps++;
      }
      motionY = step.motionY;
      y += step.deltaY;
    }

    expect(jumps).toBe(1);
    expect(y).toBeGreaterThan(0);
  });

  test('no jump while rising (motionY > 0)', () => {
    const step = stepMinecraftVertical(0.3, false, true);
    expect(step.jumped).toBe(false);
    expect(step.deltaY).toBe(0.3);
    expect(step.motionY).toBeCloseTo(0.3 - MC_GRAVITY_PER_TICK, 5);
  });

  test('grounded tick without jump stays put', () => {
    const step = stepMinecraftVertical(0, true, false);
    expect(step.deltaY).toBe(0);
    expect(step.motionY).toBe(0);
    expect(step.jumped).toBe(false);
  });

  test('jump impulse matches Minecraft', () => {
    const step = stepMinecraftVertical(0, true, true);
    expect(step.deltaY).toBe(MC_JUMP_MOTION);
    expect(step.jumped).toBe(true);
  });

  test('smooth integration reaches ~1.25 blocks', () => {
    const height = simulateSmoothJumpHeight();
    expect(height).toBeGreaterThan(1.1);
    expect(height).toBeLessThan(1.35);
  });
});

describe('movePlayer / collideMovement', () => {
  test('lands on block top when falling', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    const result = movePlayer(0.5, 1.5, 0.5, 0, -0.6, 0, boxes, false);
    expect(result.y).toBe(1);
    expect(result.onGround).toBe(true);
  });

  test('walks across deck tiles without being pushed sideways', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } }
    ];
    const result = movePlayer(0.5, 1, 0.5, 0, 0, 0, boxes, false);
    expect(result.x).toBe(0.5);
    expect(result.z).toBe(0.5);
  });

  test('walks across tile seams while grounded', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } },
      { min: { x: 2, y: 0, z: 0 }, max: { x: 3, y: 1, z: 1 } }
    ];
    let x = 0.5;
    const y = 1;
    const z = 0.5;
    const speed = 4.317;
    const dt = 1 / 60;
    for (let i = 0; i < 90; i++) {
      const moved = movePlayer(x, y, z, speed * dt, 0, 0, boxes, false);
      x = moved.x;
    }
    expect(x).toBeGreaterThan(1.5);
  });

  test('walks in X and Z on a deck', () => {
    const boxes = [];
    for (let bx = 0; bx < 4; bx++) {
      for (let bz = 0; bz < 4; bz++) {
        boxes.push({ min: { x: bx, y: 0, z: bz }, max: { x: bx + 1, y: 1, z: bz + 1 } });
      }
    }
    let x = 0.5;
    let z = 0.5;
    const y = 1;
    const speed = 4.317;
    const dt = 1 / 60;
    for (let i = 0; i < 60; i++) {
      const moved = movePlayer(x, y, z, speed * dt, 0, 0, boxes, false);
      x = moved.x;
    }
    for (let i = 0; i < 60; i++) {
      const moved = movePlayer(x, y, z, 0, 0, speed * dt, boxes, false);
      z = moved.z;
    }
    expect(x).toBeGreaterThan(1);
    expect(z).toBeGreaterThan(1);
  });

  test('does not snap to block top when brushing block side at deck level', () => {
    const boxes = [{ min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } }];
    const bounds = getPlayerBounds(1.15, 1, 0.5, false);
    const result = collideMovement(bounds, 0, 0, 0, boxes);
    expect(result.dy).toBe(0);
    expect(result.onGround).toBe(false);
  });

  test('does not depenetrate across coplanar deck seams', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } }
    ];
    const result = depenetratePosition(1.1, 1, 0.5, boxes, false);
    expect(result.x).toBeCloseTo(1.1, 5);
    expect(result.z).toBeCloseTo(0.5, 5);
  });

  test('pushes flush against deck-level wall without entering block', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 2, z: 1 } }
    ];
    const result = depenetratePosition(1.1, 1, 0.5, boxes, false);
    expect(result.x).toBeCloseTo(0.7, 5);
    expect(result.z).toBeCloseTo(0.5, 5);
  });

  test('pushes out of short wall when jumping beside it', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 2, z: 1 } }
    ];
    const result = depenetratePosition(1.1, 1.2, 0.5, boxes, false);
    expect(result.x).toBeCloseTo(0.7, 5);
    expect(result.z).toBeCloseTo(0.5, 5);
  });

  test('pushes out of tall wall when jumping against it', () => {
    const boxes = [{ min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 2, z: 1 } }];
    const result = depenetratePosition(1.1, 1.2, 0.5, boxes, false);
    expect(result.x).toBeCloseTo(0.7, 5);
  });

  test('does not slide off block when standing still on top', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    const result = movePlayer(0.5, 1, 0.5, 0, 0, 0, boxes, false);
    expect(result.x).toBe(0.5);
    expect(result.z).toBe(0.5);
    expect(result.y).toBe(1);
  });

  test('probeOnGround detects deck support', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    expect(probeOnGround(0.5, 1, 0.5, boxes, false)).toBe(true);
  });

  test('deck with hull blocks below does not create ghost walls', () => {
    const boxes = [];
    for (let bx = 0; bx < 4; bx++) {
      boxes.push({ min: { x: bx, y: -1, z: 0 }, max: { x: bx + 1, y: 0, z: 1 } });
      boxes.push({ min: { x: bx, y: 0, z: 0 }, max: { x: bx + 1, y: 1, z: 1 } });
    }
    let x = 0.5;
    const y = 1;
    const z = 0.5;
    for (let i = 0; i < 90; i++) {
      const moved = movePlayer(x, y, z, 4.317 / 60, 0, 0, boxes, false);
      x = moved.x;
    }
    expect(x).toBeGreaterThan(2);
  });

  test('can walk off deck edge', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    let x = 0.5;
    const y = 1;
    const z = 0.5;
    for (let i = 0; i < 6; i++) {
      const moved = movePlayer(x, y, z, 0.15, 0, 0, boxes, false);
      x = moved.x;
    }
    expect(x).toBeGreaterThan(1);
    expect(probeOnGround(x, y, z, boxes, false)).toBe(false);
  });
});

describe('feetOnBlockTop', () => {
  test('detects feet on block top, not when floating half a block above', () => {
    const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
    expect(feetOnBlockTop(0.5, 1.0, 0.5, box)).toBe(true);
    expect(feetOnBlockTop(0.5, 1.5, 0.5, box)).toBe(false);
  });

  test('nearestBlockTopBelow finds surface under floating feet', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    expect(nearestBlockTopBelow(0.5, 1.5, 0.5, boxes)).toBe(1);
  });

  test('nearestBlockTopBelow ignores higher blocks (no auto step-up)', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 0, y: 1, z: 0 }, max: { x: 1, y: 2, z: 1 } }
    ];
    expect(nearestBlockTopBelow(0.5, 1, 0.5, boxes)).toBe(1);
  });

  test('nearestBlockTopBelow finds top when feet are slightly sunk', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    expect(nearestBlockTopBelow(0.5, 0.85, 0.5, boxes)).toBe(1);
  });
});
