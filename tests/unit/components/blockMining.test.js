/**
 * Hold-to-mine block breaking
 */

import * as THREE from 'three';
import BlockInteractions from '../../../src/components/player/controls/BlockInteractions.js';
import { getBlockBreakSeconds } from '../../../src/blocks/blockHardness.js';

function makeMiningPlayer(block) {
  const mesh = block.mesh;
  return {
    mode: 'player',
    username: 'miner',
    activeShipSlot: 0,
    character: { position: { x: 10, y: 51.5, z: 10 } },
    cameraRotation: { x: 0, y: 0 },
    ship: {
      removeBlock: jest.fn().mockReturnValue(true),
      getBlockAtLocalPosition: jest.fn().mockReturnValue(block),
      worldToLocalPosition: jest.fn((p) => p),
      blockManager: { blocks: [block] }
    },
    inventory: { addItem: jest.fn() },
    validateShipBlocks: jest.fn(),
    shipStorage: null
  };
}

describe('BlockInteractions mining', () => {
  test('wood block requires full break time before removal', () => {
    const block = {
      type: 'wood',
      position: { x: 0, y: 0, z: 0 },
      mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    };
    block.mesh.userData.block = block;

    const player = makeMiningPlayer(block);
    const interactions = new BlockInteractions(player);
    interactions.getTargetBlock = jest.fn().mockReturnValue({
      block,
      mesh: block.mesh,
      intersection: {}
    });

    const dt = 1 / 60;
    const ticksBeforeBreak = Math.floor(getBlockBreakSeconds('wood') / dt) - 2;
    for (let i = 0; i < ticksBeforeBreak; i++) {
      expect(interactions.updateMining(dt)).toBe(false);
    }
    expect(player.ship.removeBlock).not.toHaveBeenCalled();

    let broke = false;
    for (let i = 0; i < 10; i++) {
      broke = interactions.updateMining(dt);
      if (broke) {
        break;
      }
    }
    expect(broke).toBe(true);
    expect(player.ship.removeBlock).toHaveBeenCalledWith(block.position);
    expect(player.ship.removeBlock).toHaveBeenCalledTimes(1);
  });

  test('cancelMining resets progress and clears crack overlay', () => {
    const block = {
      type: 'lift',
      position: { x: 1, y: 0, z: 0 },
      mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    };
    block.mesh.userData.block = block;

    const player = makeMiningPlayer(block);
    const interactions = new BlockInteractions(player);
    interactions.getTargetBlock = jest.fn().mockReturnValue({
      block,
      mesh: block.mesh,
      intersection: {}
    });

    interactions.updateMining(0.5);
    expect(interactions.mining.progress).toBeGreaterThan(0);
    interactions.cancelMining();
    expect(interactions.mining).toBeNull();
    expect(block.mesh.children.some((c) => c.userData?.isCrackOverlay)).toBe(false);
  });

  test('switching targets resets mining progress', () => {
    const blockA = {
      type: 'wood',
      position: { x: 0, y: 0, z: 0 },
      mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    };
    const blockB = {
      type: 'wood',
      position: { x: 1, y: 0, z: 0 },
      mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    };
    blockA.mesh.userData.block = blockA;
    blockB.mesh.userData.block = blockB;

    const player = makeMiningPlayer(blockA);
    player.ship.blockManager.blocks = [blockA, blockB];
    const interactions = new BlockInteractions(player);

    interactions.getTargetBlock = jest.fn().mockReturnValue({
      block: blockA,
      mesh: blockA.mesh,
      intersection: {}
    });
    interactions.updateMining(1.5);
    expect(interactions.mining.progress).toBeCloseTo(0.5, 1);

    interactions.getTargetBlock = jest.fn().mockReturnValue({
      block: blockB,
      mesh: blockB.mesh,
      intersection: {}
    });
    interactions.updateMining(1 / 60);
    expect(interactions.mining.key).toBe('1,0,0');
    expect(interactions.mining.progress).toBeLessThan(0.1);
  });
});
