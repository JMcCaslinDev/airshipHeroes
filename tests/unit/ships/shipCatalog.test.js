import { listShipDesigns, getShipCatalogEntry, NPC_ARENA_SHIP_IDS } from '../../../src/ships/shipCatalog.js';
import { getControlFeetLocal } from '../../../src/ships/shipCrew.js';
import { resolveNpcShipDefinition, generateAiShipDefinition } from '../../../src/ai/generateAiShipDefinition.js';

describe('ship catalog', () => {
  test('lists designs and npc arena ids', () => {
    expect(listShipDesigns().length).toBeGreaterThanOrEqual(4);
    expect(getShipCatalogEntry('sky-reaver')?.path).toContain('sky-reaver.json');
    expect(NPC_ARENA_SHIP_IDS).toHaveLength(3);
  });

  test('compact fallback still generates blocks', () => {
    const def = generateAiShipDefinition(0);
    expect(def.blocks.length).toBeGreaterThan(5);
    expect(def.blocks.some((b) => b.type === 'control')).toBe(true);
  });

  test('resolveNpcShipDefinition uses cache when present', () => {
    const cached = {
      name: 'Sky Reaver',
      blocks: [
        { type: 'control', x: 0, y: 1, z: 0 },
        { type: 'lift', x: 0, y: 2, z: 0 }
      ]
    };
    const def = resolveNpcShipDefinition(0, {
      getShipDefinition: (id) => (id === 'sky-reaver' ? cached : null)
    });
    expect(def.name).toBe('Sky Reaver');
    expect(def.blocks[0].position).toEqual({ x: 0, y: 1, z: 0 });
  });
});

describe('shipCrew', () => {
  test('getControlFeetLocal uses control block', () => {
    const ship = {
      blockManager: {
        blocks: [{ type: 'control', position: { x: 2, y: 3, z: -1 } }]
      }
    };
    expect(getControlFeetLocal(ship)).toEqual({ x: 2, y: 3.5, z: -1 });
  });
});
