/**
 * BlockInteractions placement rules
 */

import * as THREE from 'three';
import BlockInteractions from '../../../src/components/player/controls/BlockInteractions.js';

function makePlayer(blockMeshes = []) {
  return {
    mode: 'player',
    character: { position: { x: 0, y: 50, z: 0 } },
    cameraRotation: { x: 0, y: 0 },
    ship: {
      blockManager: {
        blocks: blockMeshes.length
          ? [{ mesh: blockMeshes[0], position: { x: 0, y: 0, z: 0 }, type: 'wood' }]
          : []
      }
    },
    validateShipBlocks: jest.fn()
  };
}

describe('BlockInteractions placement', () => {
  test('does not place when raycast misses a block face', () => {
    const player = makePlayer();
    const interactions = new BlockInteractions(player);
    interactions.getBlockMeshes = jest.fn().mockReturnValue([]);

    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 51.6, 5),
      new THREE.Vector3(0, 0, -1)
    );

    expect(interactions.handleBlockPlacementWithExistingShip(raycaster)).toBe(false);
  });

  test('does not place when hit is beyond max distance', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const player = makePlayer([mesh]);
    const interactions = new BlockInteractions(player);

    const raycaster = {
      intersectObjects: () => [{ distance: interactions.maxPlaceDistance + 1, object: mesh }]
    };

    expect(interactions.handleBlockPlacementWithExistingShip(raycaster)).toBe(false);
  });

  test('placeBlock fails on empty ship (no face to aim at)', () => {
    const player = makePlayer();
    const interactions = new BlockInteractions(player);

    expect(interactions.placeBlock()).toBe(false);
  });
});
