import {
  getBlockBreakSeconds,
  isUnbreakableBlock,
  breakProgressToStage
} from '../../../src/blocks/blockHardness.js';

describe('blockHardness', () => {
  test('wood breaks in 3 seconds by hand', () => {
    expect(getBlockBreakSeconds('wood')).toBe(3);
  });

  test('stone breaks in 7.5 seconds by hand', () => {
    expect(getBlockBreakSeconds('stone')).toBe(7.5);
  });

  test('lift breaks faster than wood', () => {
    expect(getBlockBreakSeconds('lift')).toBeLessThan(getBlockBreakSeconds('wood'));
  });

  test('control block is unbreakable', () => {
    expect(isUnbreakableBlock('control')).toBe(true);
  });

  test('progress maps to 10 minecraft crack stages', () => {
    expect(breakProgressToStage(0)).toBe(0);
    expect(breakProgressToStage(0.95)).toBe(9);
    expect(breakProgressToStage(1)).toBe(9);
  });
});
