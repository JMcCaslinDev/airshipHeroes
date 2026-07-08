import { isShipMoving } from '../../../src/effects/shipEngineEffects.js';
import {
  createEngineFlameMesh,
  getFlameGridPosition,
  updateEngineFlameMesh
} from '../../../src/effects/engineFlame.js';

describe('engine flames', () => {
  test('plume base sits on engine nozzle face', () => {
    expect(getFlameGridPosition({ x: 2, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toEqual({
      x: 2.44,
      y: 0,
      z: 0
    });
  });

  test('plume is a group with fire lathe and smoke layers', () => {
    const plume = createEngineFlameMesh({ x: 0, y: 0, z: -1 });
    expect(plume.type).toBe('Group');
    expect(plume.children.length).toBeGreaterThanOrEqual(5);
    expect(plume.userData.wisps?.length).toBe(3);
    plume.visible = true;
    updateEngineFlameMesh(plume, 0.1);
    expect(plume.userData.plumeUniforms.uTime.value).toBeCloseTo(0.1);
  });

  test('isShipMoving when controls or velocity active', () => {
    expect(isShipMoving(null)).toBe(false);
    expect(isShipMoving({ controls: { forward: true }, velocity: { x: 0, y: 0, z: 0 } })).toBe(true);
    expect(isShipMoving({ controls: {}, velocity: { x: 0.5, y: 0, z: 0 } })).toBe(true);
    expect(isShipMoving({ controls: {}, velocity: { x: 0, y: 0, z: 0 } })).toBe(false);
  });
});
