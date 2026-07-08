/**
 * Player mode + ship-local collision integration (real transforms, no THREE mock).
 */

import * as THREE from 'three';
import ShipTransform from '../../../src/components/ship/ShipTransform.js';
import { createPlayerModeController } from '../../../src/modes/playerMode.js';
import { probeOnGround } from '../../../src/physics/playerMovement.js';
import { getShipLocalBlockBoxes, getControlBlockFeetWorld } from '../../../src/physics/shipLocalCollision.js';

function makeShipWithDeck(rotationY, size = 8) {
  const group = new THREE.Group();
  group.position.set(10, 50, 10);
  group.rotation.y = rotationY;

  const ship = {
    position: { x: 10, y: 50, z: 10 },
    rotation: rotationY,
    group,
    blockManager: { blocks: [] },
    steeringWheel: null
  };
  ship.transform = new ShipTransform(ship);

  const blocks = [];
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      mesh.position.set(x, 0, z);
      group.add(mesh);
      const block = {
        type: x === 0 && z === 0 ? 'control' : 'wood',
        position: { x, y: 0, z },
        mesh
      };
      blocks.push(block);
    }
  }
  ship.blockManager.blocks = blocks;
  ship.steeringWheel = blocks[0];
  group.updateMatrixWorld(true);
  return ship;
}

function makePlayer(ship) {
  return {
    mode: 'player',
    cameraRotation: { x: 0, y: 0 },
    character: {
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      velocity: { x: 0, y: 0, z: 0 },
      isJumping: false,
      isSneaking: false,
      isOnGround: true,
      mesh: {
        position: { x: 0, y: 0, z: 0, set: jest.fn() },
        rotation: { x: 0, y: 0, z: 0, y: 0 },
        visible: false
      },
      setFirstPersonView: jest.fn()
    },
    ship,
    inventory: {
      selectedSlot: 0,
      slots: Array(9).fill(null),
      getSelectedBlock: jest.fn().mockReturnValue({ type: 'wood' })
    },
    controls: {
      blockInteractions: {
        maxPlaceDistance: 4,
        breakBlock: jest.fn().mockReturnValue(false),
        placeBlock: jest.fn().mockReturnValue(false)
      }
    }
  };
}

function makeCamera() {
  return {
    position: { x: 0, y: 0, z: 0, set: jest.fn() },
    rotation: { x: 0, y: 0, z: 0, order: 'YXZ' },
    fov: 75,
    updateProjectionMatrix: jest.fn(),
    updateMatrixWorld: jest.fn(),
    lookAt: jest.fn()
  };
}

describe('player mode ship-local integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="inventory"></div><div id="crosshair"></div>';
    global.requestAnimationFrame = (cb) => {
      cb();
      return 0;
    };
    document.body.requestPointerLock = jest.fn();
  });

  test('activate spawns on control block top for rotated ship', () => {
    const ship = makeShipWithDeck(Math.PI / 2);
    const player = makePlayer(ship);
    const controller = createPlayerModeController(player, makeCamera());
    controller.activate();

    const local = ship.transform.worldToLocalPosition(player.character.position);
    expect(local.x).toBeCloseTo(0, 4);
    expect(local.y).toBeCloseTo(0.5, 4);
    expect(local.z).toBeCloseTo(0, 4);
  });

  const walkCases = [
    { label: '0°', rotation: 0, keys: { forward: true } },
    { label: '90°', rotation: Math.PI / 2, keys: { forward: true } },
    { label: '90° strafe', rotation: Math.PI / 2, keys: { right: true } }
  ];

  for (const { label, rotation, keys } of walkCases) {
    test(`walks on deck at ${label}`, () => {
      const ship = makeShipWithDeck(rotation);
      const player = makePlayer(ship);
      const controller = createPlayerModeController(player, makeCamera());
      controller.activate();

      const center = ship.transform.localToWorldPosition({ x: 4, y: 0.5, z: 4 });
      player.character.position.x = center.x;
      player.character.position.y = center.y;
      player.character.position.z = center.z;

      const startLocal = ship.transform.worldToLocalPosition(player.character.position);
      const boxes = getShipLocalBlockBoxes(ship);
      for (let i = 0; i < 25; i++) {
        controller.handleInput({
          forward: !!keys.forward,
          backward: false,
          left: !!keys.left,
          right: !!keys.right,
          up: false,
          down: false,
          sprint: false,
          toggleCamera: false,
          slot1: false,
          slot2: false,
          slot3: false,
          slot4: false,
          slot5: false,
          slot6: false,
          slot7: false,
          slot8: false,
          slot9: false
        });
        controller.update(1 / 60);
      }

      const endLocal = ship.transform.worldToLocalPosition(player.character.position);
      const moved = Math.hypot(endLocal.x - startLocal.x, endLocal.z - startLocal.z);
      expect(moved).toBeGreaterThan(0.3);
      expect(probeOnGround(endLocal.x, endLocal.y, endLocal.z, boxes, false)).toBe(true);
    });
  }

  test('jump and land on rotated deck', () => {
    const ship = makeShipWithDeck(Math.PI / 4);
    const player = makePlayer(ship);
    const controller = createPlayerModeController(player, makeCamera());
    controller.activate();

    const startY = player.character.position.y;
    let maxY = startY;

    for (let i = 0; i < 50; i++) {
      controller.handleInput({
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: i < 5,
        down: false,
        sprint: false,
        toggleCamera: false,
        slot1: false,
        slot2: false,
        slot3: false,
        slot4: false,
        slot5: false,
        slot6: false,
        slot7: false,
        slot8: false,
        slot9: false
      });
      controller.update(1 / 60);
      maxY = Math.max(maxY, player.character.position.y);
    }

    expect(maxY).toBeGreaterThan(startY + 0.3);
    const local = ship.transform.worldToLocalPosition(player.character.position);
    expect(local.y).toBeCloseTo(0.5, 1);
  });

  test('sneak keeps feet on deck', () => {
    const ship = makeShipWithDeck(Math.PI / 3);
    const player = makePlayer(ship);
    const controller = createPlayerModeController(player, makeCamera());
    controller.activate();

    for (let i = 0; i < 30; i++) {
      controller.handleInput({
        forward: true,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: true,
        sprint: false,
        toggleCamera: false,
        slot1: false,
        slot2: false,
        slot3: false,
        slot4: false,
        slot5: false,
        slot6: false,
        slot7: false,
        slot8: false,
        slot9: false
      });
      controller.update(1 / 60);
    }

    const local = ship.transform.worldToLocalPosition(player.character.position);
    const boxes = getShipLocalBlockBoxes(ship);
    expect(probeOnGround(local.x, local.y, local.z, boxes, true)).toBe(true);
  });

  test('control block feet match activate position after ship rotation change', () => {
    const ship = makeShipWithDeck(0);
    ship.group.rotation.y = Math.PI;
    ship.rotation = Math.PI;
    ship.group.updateMatrixWorld(true);

    const feet = getControlBlockFeetWorld(ship);
    const player = makePlayer(ship);
    const controller = createPlayerModeController(player, makeCamera());
    controller.activate();

    expect(player.character.position.x).toBeCloseTo(feet.x, 4);
    expect(player.character.position.y).toBeCloseTo(feet.y, 4);
    expect(player.character.position.z).toBeCloseTo(feet.z, 4);
  });
});
