import {
  computeThirdPersonCamera,
  THIRD_PERSON_BACK,
  THIRD_PERSON_HEIGHT
} from '../../../src/components/player/modes/playerCharacterVisuals.js';

describe('computeThirdPersonCamera', () => {
  test('camera is higher and farther behind the player than first person', () => {
    const feet = { x: 10, y: 50, z: 10 };
    const cam = computeThirdPersonCamera(feet, 1.62, 0);

    expect(cam.position.y).toBeCloseTo(feet.y + THIRD_PERSON_HEIGHT, 5);
    expect(cam.position.z).toBeCloseTo(feet.z + THIRD_PERSON_BACK, 5);
    expect(cam.position.y).toBeGreaterThan(feet.y + 1.62);
  });

  test('camera is far enough behind to clear the player model', () => {
    const feet = { x: 0, y: 0, z: 0 };
    const cam = computeThirdPersonCamera(feet, 1.62, 0);
    const dist = Math.hypot(
      cam.position.x - feet.x,
      cam.position.z - feet.z
    );
    expect(dist).toBeGreaterThanOrEqual(THIRD_PERSON_BACK - 0.01);
  });

  test('look target is above feet toward upper body', () => {
    const cam = computeThirdPersonCamera({ x: 0, y: 0, z: 0 }, 1.62, 0);
    expect(cam.lookAt.y).toBeGreaterThan(1);
  });
});
