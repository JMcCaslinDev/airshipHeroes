import {
  drawMinimap,
  updateCompass,
  worldDeltaToMap,
  MINIMAP_SIZE
} from '../../../src/ui/minimap.js';

describe('minimap', () => {
  test('worldDeltaToMap puts forward direction at map-up', () => {
    const rot = Math.PI / 2; // facing +X
    const fwd = worldDeltaToMap(Math.sin(rot), Math.cos(rot), rot);
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(-1, 5); // up on canvas
  });

  test('drawMinimap paints without throwing', () => {
    const ops = [];
    const canvas = {
      width: MINIMAP_SIZE,
      getContext: () => ({
        clearRect: (...a) => ops.push(['clear', ...a]),
        beginPath: () => ops.push(['begin']),
        arc: () => ops.push(['arc']),
        fill: () => ops.push(['fill']),
        stroke: () => ops.push(['stroke']),
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        save: () => {},
        restore: () => {},
        clip: () => {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0
      })
    };

    drawMinimap(canvas, {
      self: { x: 10, z: -20, rotation: 0.5 },
      enemies: [{ x: 100, z: 50 }]
    });

    expect(ops.some((o) => o[0] === 'clear')).toBe(true);
    expect(ops.some((o) => o[0] === 'fill')).toBe(true);
  });

  test('updateCompass rotates needle and labels degrees', () => {
    const needle = { style: {} };
    const label = { textContent: '' };
    updateCompass(needle, label, Math.PI / 2);
    expect(needle.style.transform).toContain('rotate(');
    expect(label.textContent).toBe('90°');
  });
});
