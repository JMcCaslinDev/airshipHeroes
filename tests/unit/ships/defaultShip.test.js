/**
 * Default ship definition — ported from airshipwars createBaseShip()
 */

import fs from 'fs';
import path from 'path';
import BlockFactory from '../../../src/blocks/blockFactory.js';

const defaultPath = path.join(process.cwd(), 'public/assets/ships/default.json');
const definition = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));

describe('default ship definition', () => {
  test('matches airshipwars scale (~243 blocks, >40% lift)', () => {
    expect(definition.blocks.length).toBeGreaterThan(200);
    const lift = definition.blocks.filter(b => b.type === 'lift').length;
    expect(lift / definition.blocks.length).toBeGreaterThan(0.4);
  });

  test('has control, cannons, and engines', () => {
    const types = new Set(definition.blocks.map(b => b.type));
    expect(types.has('control')).toBe(true);
    expect(types.has('cannon')).toBe(true);
    expect(types.has('engine')).toBe(true);
  });

  test('loads through BlockFactory ship definition path', () => {
    const blocks = BlockFactory.createBlocksFromShipDefinition(definition);
    expect(blocks.length).toBe(definition.blocks.length);
    expect(BlockFactory.hasEnoughLift(blocks)).toBe(true);
  });
});
