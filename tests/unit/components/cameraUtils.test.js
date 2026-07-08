/**
 * Mode cameras must not be overridden by CameraUtils each frame.
 */

import { updateCamera } from '../../../src/components/player/utils/CameraUtils.js';

describe('CameraUtils', () => {
  test('does not move camera in ship mode (shipModeController owns it)', () => {
    const camera = {
      position: { x: 1, y: 2, z: 3, set: jest.fn() },
      lookAt: jest.fn()
    };
    const player = {
      mode: 'ship',
      camera,
      ship: {
        getCameraPositionAndTarget: jest.fn().mockReturnValue({
          position: { x: 99, y: 99, z: 99 },
          target: { x: 0, y: 0, z: 0 }
        })
      }
    };

    updateCamera(player);

    expect(camera.position.set).not.toHaveBeenCalled();
    expect(camera.lookAt).not.toHaveBeenCalled();
    expect(player.ship.getCameraPositionAndTarget).not.toHaveBeenCalled();
  });

  test('does not move camera in player mode (playerModeController owns it)', () => {
    const camera = {
      position: {
        x: 5,
        y: 6,
        z: 7,
        set: jest.fn()
      },
      rotation: { x: 0, y: 0, z: 0, order: 'YXZ' },
      updateProjectionMatrix: jest.fn(),
      updateMatrixWorld: jest.fn()
    };
    const player = {
      mode: 'player',
      camera,
      character: { position: { x: 0, y: 50, z: 0 } },
      cameraRotation: { x: 0, y: 0 }
    };

    updateCamera(player);

    expect(camera.position.set).not.toHaveBeenCalled();
    expect(camera.position.x).toBe(5);
    expect(camera.position.y).toBe(6);
  });
});
