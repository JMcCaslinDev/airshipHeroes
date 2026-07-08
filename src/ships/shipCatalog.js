/**
 * Bundled ship design catalog — lists JSON under /assets/ships/.
 */

export const SHIP_CATALOG = [
  {
    id: 'default',
    name: 'Airship Wars Default',
    kind: 'player',
    path: '/assets/ships/default.json'
  },
  {
    id: 'raider-compact-1',
    name: 'Raider Compact 1',
    kind: 'npc-compact',
    path: '/assets/ships/npc/raider-compact-1.json'
  },
  {
    id: 'raider-compact-2',
    name: 'Raider Compact 2',
    kind: 'npc-compact',
    path: '/assets/ships/npc/raider-compact-2.json'
  },
  {
    id: 'raider-compact-3',
    name: 'Raider Compact 3',
    kind: 'npc-compact',
    path: '/assets/ships/npc/raider-compact-3.json'
  },
  {
    id: 'sky-reaver',
    name: 'Sky Reaver',
    kind: 'npc',
    path: '/assets/ships/npc/sky-reaver.json'
  },
  {
    id: 'storm-finch',
    name: 'Storm Finch',
    kind: 'npc',
    path: '/assets/ships/npc/storm-finch.json'
  },
  {
    id: 'iron-gale',
    name: 'Iron Gale',
    kind: 'npc',
    path: '/assets/ships/npc/iron-gale.json'
  }
];

/** NPC arena loadouts (larger hulls) — one per bot name index */
export const NPC_ARENA_SHIP_IDS = ['sky-reaver', 'storm-finch', 'iron-gale'];

export function listShipDesigns(kind = null) {
  if (!kind) {
    return [...SHIP_CATALOG];
  }
  return SHIP_CATALOG.filter((d) => d.kind === kind);
}

export function getShipCatalogEntry(id) {
  return SHIP_CATALOG.find((d) => d.id === id) ?? null;
}

/**
 * @param {string} id
 * @param {Map<string, Object>|null} cache resourceLoader map
 */
export function getCachedShipDefinition(id, cache = null) {
  if (cache?.get) {
    return cache.get(id) ?? null;
  }
  return null;
}

export async function fetchShipDefinition(id) {
  const entry = getShipCatalogEntry(id);
  if (!entry) {
    return null;
  }
  const res = await fetch(entry.path);
  if (!res.ok) {
    throw new Error(`Failed to load ship ${id}: ${res.status}`);
  }
  return res.json();
}
