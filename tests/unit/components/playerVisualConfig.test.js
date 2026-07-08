import { playerVisualConfig, setShowPlayerOutline } from '../../../src/components/player/playerVisualConfig.js';

describe('playerVisualConfig', () => {
  afterEach(() => {
    setShowPlayerOutline(false);
  });

  test('outline is off by default', () => {
    expect(playerVisualConfig.showPlayerOutline).toBe(false);
  });

  test('setShowPlayerOutline toggles flag', () => {
    setShowPlayerOutline(true);
    expect(playerVisualConfig.showPlayerOutline).toBe(true);
    setShowPlayerOutline(false);
    expect(playerVisualConfig.showPlayerOutline).toBe(false);
  });
});
