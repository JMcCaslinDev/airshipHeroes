/**
 * AI / NPC ship definitions — prefers catalog JSON, falls back to compact layouts.
 */

import {
  NPC_ARENA_SHIP_IDS,
  getShipCatalogEntry
} from '../ships/shipCatalog.js';

/** Preserved compact layouts (also saved under public/assets/ships/npc/raider-compact-*.json). */
export const COMPACT_LAYOUTS = [
  [
    { type: 'control', position: { x: 0, y: 0, z: 0 } },
    { type: 'lift', position: { x: 0, y: -1, z: 0 } },
    { type: 'lift', position: { x: -1, y: 0, z: 0 } },
    { type: 'lift', position: { x: 1, y: 0, z: 0 } },
    { type: 'lift', position: { x: 0, y: 0, z: -1 } },
    { type: 'wood', position: { x: 0, y: 0, z: 1 } },
    { type: 'wood', position: { x: 0, y: 0, z: 2 } },
    { type: 'stone', position: { x: 0, y: 0, z: 3 } },
    { type: 'engine', position: { x: -1, y: 0, z: -1 }, direction: { x: 0, y: 0, z: -1 } },
    { type: 'engine', position: { x: 1, y: 0, z: -1 }, direction: { x: 0, y: 0, z: -1 } }
  ],
  [
    { type: 'control', position: { x: 0, y: 0, z: 0 } },
    { type: 'lift', position: { x: -1, y: 0, z: 0 } },
    { type: 'lift', position: { x: 1, y: 0, z: 0 } },
    { type: 'lift', position: { x: 0, y: 0, z: 1 } },
    { type: 'lift', position: { x: 0, y: 0, z: -1 } },
    { type: 'wood', position: { x: -1, y: 0, z: 1 } },
    { type: 'wood', position: { x: 1, y: 0, z: 1 } },
    { type: 'stone', position: { x: 0, y: 0, z: 2 } },
    { type: 'engine', position: { x: -2, y: 0, z: 0 }, direction: { x: -1, y: 0, z: 0 } },
    { type: 'engine', position: { x: 2, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }
  ],
  [
    { type: 'control', position: { x: 0, y: 0, z: 0 } },
    { type: 'lift', position: { x: 0, y: -1, z: 0 } },
    { type: 'lift', position: { x: -1, y: -1, z: 0 } },
    { type: 'lift', position: { x: 1, y: -1, z: 0 } },
    { type: 'lift', position: { x: 0, y: 0, z: -1 } },
    { type: 'wood', position: { x: -1, y: 0, z: 1 } },
    { type: 'wood', position: { x: 1, y: 0, z: 1 } },
    { type: 'armor', position: { x: 0, y: 0, z: 2 } },
    { type: 'engine', position: { x: 0, y: 0, z: -2 }, direction: { x: 0, y: 0, z: -1 } },
    { type: 'cannon', position: { x: 0, y: 1, z: 2 } }
  ]
];

function cloneLayout(blocks) {
  return blocks.map((block) => ({
    ...block,
    position: { ...block.position },
    ...(block.direction ? { direction: { ...block.direction } } : {})
  }));
}

/** Compact fallback (old small hulls). */
export function generateAiShipDefinition(variant = 0) {
  const blocks = COMPACT_LAYOUTS[variant % COMPACT_LAYOUTS.length];
  return {
    name: `Raider ${variant + 1}`,
    blocks: cloneLayout(blocks)
  };
}

/**
 * Prefer cached large NPC design from resourceLoader; else compact fallback.
 * @param {number} variant
 * @param {{ getShipDefinition?: (id: string) => Object|null }|null} resources
 */
export function resolveNpcShipDefinition(variant = 0, resources = null) {
  const id = NPC_ARENA_SHIP_IDS[variant % NPC_ARENA_SHIP_IDS.length];
  const cached = resources?.getShipDefinition?.(id);
  if (cached?.blocks?.length) {
    return {
      name: cached.name || getShipCatalogEntry(id)?.name || id,
      blocks: cached.blocks.map((b) => {
        if (b.position) {
          return {
            type: b.type,
            position: { ...b.position },
            ...(b.direction ? { direction: { ...b.direction } } : {})
          };
        }
        return {
          type: b.type,
          position: { x: b.x, y: b.y, z: b.z },
          ...(b.direction ? { direction: { ...b.direction } } : {})
        };
      })
    };
  }
  return generateAiShipDefinition(variant);
}
