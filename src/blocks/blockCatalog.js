/**
 * Single source of truth for placeable blocks, /info blurbs, and kill-credit costs.
 */

export const BLOCK_CATALOG = {
  wood: {
    type: 'wood',
    name: 'Wood',
    description: 'Light hull planking. Cheap structure for decks and walls.',
    cost: 2
  },
  stone: {
    type: 'stone',
    name: 'Stone',
    description: 'Sturdier hull material. Slower to break than wood.',
    cost: 3
  },
  lift: {
    type: 'lift',
    name: 'Lift',
    description: 'Buoyancy block. Keep lift ≥30% of hull or the ship sinks.',
    cost: 5
  },
  armor: {
    type: 'armor',
    name: 'Armor',
    description: 'Heavy plating. Absorbs more damage; adds weight.',
    cost: 5
  },
  cannon: {
    type: 'cannon',
    name: 'Cannon',
    description: 'Fires TNT projectiles with a short fuse and arc.',
    cost: 12
  },
  engine: {
    type: 'engine',
    name: 'Engine',
    description: 'Thrust. More engines raise max speed; weight slows you.',
    cost: 15
  },
  dispenser: {
    type: 'dispenser',
    name: 'Dispenser',
    description: 'Pulse weapon / utility block for combat systems.',
    cost: 10
  },
  redstone: {
    type: 'redstone',
    name: 'Redstone',
    description: 'Wiring dust for linking ship systems. Near-zero weight.',
    cost: 1
  },
  control: {
    type: 'control',
    name: 'Steering Wheel',
    description: 'Primary helm. Required to thrust and turn in ship mode.',
    cost: 25
  }
};

export function listBlockTypes() {
  return Object.keys(BLOCK_CATALOG);
}

export function getBlockInfo(type) {
  if (!type) {
    return null;
  }
  return BLOCK_CATALOG[String(type).toLowerCase()] ?? null;
}

export function getBlockCost(type) {
  return getBlockInfo(type)?.cost ?? null;
}

export function isKnownBlockType(type) {
  return !!getBlockInfo(type);
}
