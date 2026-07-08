import {
  damageShipBlock,
  healShipBlocks,
  recalculateShipHealth
} from '../../../src/combat/shipCombat.js';
import {
  BLOCK_HEAL_DELAY,
  BLOCK_HEAL_PER_SECOND
} from '../../../src/combat/shipCombatConfig.js';

function mockShipWithBlock(health, maxHealth = 8) {
  const block = {
    type: 'wood',
    position: { x: 0, y: 0, z: 0 },
    health,
    maxHealth,
    _healDelay: 0
  };
  return {
    blockManager: {
      blocks: [block],
      removeBlock() {
        this.blocks = [];
      }
    },
    health,
    maxHealth,
    sinkState: 'none',
    isSinking: false
  };
}

describe('block heal', () => {
  test('damaged blocks heal after delay', () => {
    const ship = mockShipWithBlock(4, 8);
    const block = ship.blockManager.blocks[0];
    block._healDelay = BLOCK_HEAL_DELAY;

    healShipBlocks(ship, BLOCK_HEAL_DELAY);
    expect(block.health).toBe(4);

    healShipBlocks(ship, 1);
    expect(block.health).toBeCloseTo(4 + BLOCK_HEAL_PER_SECOND, 5);
  });

  test('damageShipBlock sets heal delay', () => {
    const ship = mockShipWithBlock(8, 8);
    const block = ship.blockManager.blocks[0];
    damageShipBlock(ship, block, 2);
    expect(block.health).toBe(6);
    expect(block._healDelay).toBe(BLOCK_HEAL_DELAY);
  });
});
