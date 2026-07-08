import {
  syncControlBlocks,
  canBreakControlBlock,
  getControlBlocks
} from '../../../src/blocks/controlBlockRules.js';

function makeShip(controls) {
  const blocks = controls.map((c, i) => ({
    type: 'control',
    position: { x: i, y: 0, z: 0 },
    mesh: {
      material: {
        color: { setHex() {} },
        emissive: { setHex() {} },
        emissiveIntensity: 0
      }
    }
  }));
  return {
    steeringWheel: null,
    blockManager: { blocks }
  };
}

describe('controlBlockRules', () => {
  test('first control is primary; extras marked removable', () => {
    const ship = makeShip([{}, {}, {}]);
    const extras = syncControlBlocks(ship);

    expect(extras).toBe(2);
    expect(ship.steeringWheel).toBe(ship.blockManager.blocks[0]);
    expect(ship.blockManager.blocks[0].isExtraControl).toBe(false);
    expect(ship.blockManager.blocks[1].isExtraControl).toBe(true);
    expect(ship.blockManager.blocks[2].isExtraControl).toBe(true);
  });

  test('only extras can be broken', () => {
    const ship = makeShip([{}, {}]);
    syncControlBlocks(ship);

    expect(canBreakControlBlock(ship.blockManager.blocks[0])).toBe(false);
    expect(canBreakControlBlock(ship.blockManager.blocks[1])).toBe(true);
  });

  test('getControlBlocks finds control types', () => {
    const ship = {
      blockManager: {
        blocks: [
          { type: 'control' },
          { type: 'wood' },
          { type: 'steeringWheel' }
        ]
      }
    };
    expect(getControlBlocks(ship)).toHaveLength(2);
  });
});
