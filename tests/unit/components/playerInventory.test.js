import PlayerInventory from '../../../src/components/player/inventory/PlayerInventory.js';

describe('PlayerInventory', () => {
  test('initialize includes dispenser and redstone', () => {
    const inventory = new PlayerInventory();
    inventory.initialize();

    const types = inventory.slots.filter(Boolean).map((slot) => slot.type);
    expect(types).toContain('dispenser');
    expect(types).toContain('redstone');
  });

  test('ensureBuildBlocks backfills missing combat blocks', () => {
    const inventory = new PlayerInventory();
    inventory.slots = [
      { type: 'wood', count: 999 },
      { type: 'stone', count: 999 },
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ];

    inventory.ensureBuildBlocks(['dispenser', 'redstone']);

    expect(inventory.slots.some((slot) => slot?.type === 'dispenser')).toBe(true);
    expect(inventory.slots.some((slot) => slot?.type === 'redstone')).toBe(true);
  });
});
