import { getBlockMeshLocalPosition, REDSTONE_MESH_Y_OFFSET } from '../../../src/blocks/blockFactory.js';

describe('getBlockMeshLocalPosition', () => {
  test('places redstone dust on the floor of its cell', () => {
    const pos = getBlockMeshLocalPosition({
      type: 'redstone',
      position: { x: 2, y: 3, z: 4 }
    });
    expect(pos.y).toBeCloseTo(3 - REDSTONE_MESH_Y_OFFSET);
    expect(pos.x).toBe(2);
    expect(pos.z).toBe(4);
  });

  test('keeps full blocks at grid center', () => {
    const pos = getBlockMeshLocalPosition({
      type: 'wood',
      position: { x: 1, y: 0, z: -1 }
    });
    expect(pos).toEqual({ x: 1, y: 0, z: -1 });
  });
});
