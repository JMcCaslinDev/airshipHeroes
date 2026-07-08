import {
  createSteveSkinCanvas,
  createSteveSkinTexture,
  createHeadMaterials
} from '../../../src/components/player/modes/steveSkin.js';

describe('steveSkin', () => {
  test('creates 64x64 skin atlas', () => {
    const canvas = createSteveSkinCanvas();
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
  });

  test('creates nearest-filtered texture', () => {
    const texture = createSteveSkinTexture();
    expect(texture).toBeTruthy();
    expect(texture.magFilter).toBe(1003); // THREE.NearestFilter
  });

  test('head uses six face materials from skin atlas', () => {
    const canvas = createSteveSkinCanvas();
    const materials = createHeadMaterials(canvas);
    expect(materials).toHaveLength(6);
    expect(materials[0].map).toBeTruthy();
  });
});
