import {
  normalizeAngle,
  computeRamControls,
  computeAvoidControls,
  updateAiRamControls
} from '../../../src/ai/aiShipController.js';

describe('aiShipController', () => {
  test('charges forward when target is ahead', () => {
    const ship = { position: { x: 0, y: 50, z: 0 }, rotation: 0 };
    const target = { position: { x: 0, y: 50, z: 30 } };
    const controls = computeRamControls(ship, target);
    expect(controls.forward).toBe(true);
    expect(controls.left).toBe(false);
    expect(controls.right).toBe(false);
  });

  test('turns toward target offset to the side', () => {
    const ship = { position: { x: 0, y: 50, z: 0 }, rotation: 0 };
    const target = { position: { x: 30, y: 50, z: 0 } };
    const controls = computeRamControls(ship, target);
    expect(controls.left).toBe(true);
    expect(controls.forward).toBe(false);
  });

  test('avoid controls flee from nearby ship', () => {
    const ship = { position: { x: 0, y: 50, z: 0 }, rotation: 0 };
    const other = { position: { x: 0, y: 50, z: 8 } };
    const controls = computeAvoidControls(ship, other);
    expect(controls.backward || controls.left || controls.right).toBe(true);
    expect(controls.forward).toBe(false);
  });

  test('bots wander when rng denies ram and no human target', () => {
    const ship = {
      position: { x: 0, y: 50, z: 0 },
      rotation: 0,
      controls: {},
      aiModeTimer: 0
    };
    const botTarget = {
      username: 'bot2',
      ship: { position: { x: 30, y: 50, z: 0 }, isDestroyed: false }
    };
    let n = 0;
    const rng = () => (n++ % 2 === 0 ? 0.99 : 0.99);

    updateAiRamControls(ship, [botTarget], 0.1, rng);

    expect(ship.aiMode).toBe('wander');
    expect(ship.controls.forward).toBe(true);
  });

  test('normalizeAngle wraps to [-pi, pi]', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI);
  });
});
