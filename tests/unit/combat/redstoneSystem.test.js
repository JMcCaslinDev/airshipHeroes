import {
  computePoweredTiles,
  pulseShipDispensers
} from '../../../src/combat/redstoneSystem.js';

function makeShip(blocks) {
  const blockList = blocks.map((def) => ({
    type: def.type,
    position: { ...def.position },
    dispenserCooldown: 0,
    mesh: def.type === 'redstone' ? { material: { emissive: { setHex() {} }, emissiveIntensity: 0 } } : null
  }));

  return {
    blockManager: { blocks: blockList },
    redstonePulseTimer: 0,
    owner: { username: 'attacker' },
    position: { x: 0, y: 50, z: 0 },
    rotation: 0,
    getBlockWorldPosition(block) {
      return { ...block.position };
    }
  };
}

describe('redstoneSystem', () => {
  test('powers redstone chain from control block', () => {
    const ship = makeShip([
      { type: 'control', position: { x: 0, y: 0, z: 0 } },
      { type: 'redstone', position: { x: 1, y: 0, z: 0 } },
      { type: 'redstone', position: { x: 2, y: 0, z: 0 } },
      { type: 'dispenser', position: { x: 3, y: 0, z: 0 } }
    ]);

    const powered = computePoweredTiles(ship);
    expect(powered.has('0,0,0')).toBe(true);
    expect(powered.has('1,0,0')).toBe(true);
    expect(powered.has('2,0,0')).toBe(true);
    expect(powered.has('3,0,0')).toBe(false);
  });

  test('pulseShipDispensers activates wired dispenser even without a burn target', () => {
    const attackerShip = makeShip([
      { type: 'control', position: { x: 0, y: 0, z: 0 } },
      { type: 'dispenser', position: { x: 1, y: 0, z: 0 } }
    ]);

    const fired = pulseShipDispensers(attackerShip, []);
    expect(fired).toBe(0);
    expect(
      attackerShip.blockManager.blocks.find((b) => b.type === 'dispenser').dispenserCooldown
    ).toBeGreaterThan(0);
  });

  test('pulseShipDispensers fires only on space trigger path', () => {
    const victimBlock = {
      type: 'wood',
      position: { x: 0, y: 0, z: 10 },
      isBurning: false
    };
    const victimShip = {
      blockManager: { blocks: [victimBlock] },
      getBlockWorldPosition(b) {
        return { ...b.position };
      }
    };
    const attackerShip = makeShip([
      { type: 'control', position: { x: 0, y: 0, z: 0 } },
      { type: 'redstone', position: { x: 1, y: 0, z: 0 } },
      { type: 'dispenser', position: { x: 2, y: 0, z: 0 } }
    ]);

    const fired = pulseShipDispensers(attackerShip, [{ ship: victimShip }]);
    expect(fired).toBe(1);
    expect(victimBlock.isBurning).toBe(true);
    expect(
      attackerShip.blockManager.blocks.find((b) => b.type === 'dispenser').dispenserCooldown
    ).toBeGreaterThan(0);
  });
});