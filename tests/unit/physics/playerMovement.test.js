/**
 * Minecraft vertical jump physics
 */

import {
  stepMinecraftVertical,
  simulateMinecraftJumpHeight,
  feetOnBlockTop,
  nearestBlockTopBelow,
  resolvePlayerCollisions,
  MC_JUMP_MOTION,
  MC_GRAVITY_PER_TICK,
  PLAYER_JUMP_HEIGHT
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
});

describe('resolvePlayerCollisions', () => {
  test('lands on block top when falling', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    const result = resolvePlayerCollisions(0.5, 0.9, 0.5, boxes, false, -0.1);
    expect(result.y).toBe(1);
    expect(result.onGround).toBe(true);
    expect(result.motionY).toBe(0);
  });

  test('resolves horizontal penetration against a tall wall', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 2, z: 1 } }
    ];
    const result = resolvePlayerCollisions(1.1, 1, 0.5, boxes, false, 0, { axes: 'xz' });
    expect(result.x).toBeLessThan(1.1);
    expect(result.y).toBe(1);
  });

  test('walks across deck tiles without being pushed sideways', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } }
    ];
    const result = resolvePlayerCollisions(1.05, 1, 0.5, boxes, false, 0, { axes: 'xz' });
    expect(result.x).toBe(1.05);
    expect(result.z).toBe(0.5);
  });

  test('does not slide off block when standing still on top', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    const result = resolvePlayerCollisions(0.5, 1, 0.5, boxes, false, 0, { axes: 'xz' });
    expect(result.x).toBe(0.5);
    expect(result.z).toBe(0.5);
    expect(result.y).toBe(1);
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

  test('nearestBlockTopBelow finds top when feet are inside block volume', () => {
    const boxes = [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }];
    expect(nearestBlockTopBelow(0.5, 0.8, 0.5, boxes)).toBe(1);
  });
});
