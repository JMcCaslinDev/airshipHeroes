import {
  getGroundColumnHeight,
  getFortSites,
  isPathTile,
  LANDSCAPE_HALF_SIZE
} from '../../../src/world/groundLandscape.js';

describe('groundLandscape', () => {
  test('column heights stay within thin surface range', () => {
    for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        const height = getGroundColumnHeight(x, z, 42);
        expect(height).toBeGreaterThanOrEqual(0);
        expect(height).toBeLessThanOrEqual(2);
      }
    }
  });

  test('paths include main cross roads', () => {
    expect(isPathTile(0, 40, 42)).toBe(true);
    expect(isPathTile(40, 0, 42)).toBe(true);
    expect(isPathTile(12, 4, 42)).toBe(isPathTile(12, 4, 42));
  });

  test('fort sites cover the 500x500 map', () => {
    expect(LANDSCAPE_HALF_SIZE).toBe(250);
    const sites = getFortSites(250, 42);
    expect(sites.length).toBeGreaterThan(20);
    expect(sites.some((s) => s.x > 100)).toBe(true);
    expect(sites.some((s) => s.x < -100)).toBe(true);
  });
});
