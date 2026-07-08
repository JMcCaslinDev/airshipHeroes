/**
 * PlayerCharacter third-person skin + outline marker
 */

import * as THREE from 'three';
import ShipTransform from '../../../src/components/ship/ShipTransform.js';
import PlayerCharacter from '../../../src/components/player/modes/PlayerCharacter.js';
import { setShowPlayerOutline } from '../../../src/components/player/playerVisualConfig.js';

function makeShip() {
  const group = new THREE.Group();
  const ship = {
    position: { x: 5, y: 50, z: 5 },
    rotation: 0,
    group
  };
  ship.transform = new ShipTransform(ship);
  return ship;
}

describe('PlayerCharacter view modes', () => {
  let scene;
  let character;

  beforeEach(() => {
    setShowPlayerOutline(false);
    scene = new THREE.Scene();
    character = new PlayerCharacter();
    character.createMesh(scene);
    character.position = { x: 2, y: 51, z: 3 };
    character.rotation = 0.75;
  });

  test('third person shows skinned mesh; outline hidden by default', () => {
    character.setViewMode('third');

    expect(character.mesh.visible).toBe(true);
    expect(character.outlineMesh.visible).toBe(false);
    expect(character.mesh.children.length).toBeGreaterThanOrEqual(5);
    expect(character.mesh.children[0].material).toBeTruthy();
  });

  test('third person shows outline when showPlayerOutline is enabled', () => {
    setShowPlayerOutline(true);
    character.setViewMode('third');

    expect(character.mesh.visible).toBe(true);
    expect(character.outlineMesh.visible).toBe(true);
    expect(character.outlineMesh.position.x).toBe(2);
    expect(character.outlineMesh.position.y).toBe(51);
    expect(character.outlineMesh.position.z).toBe(3);
    expect(character.outlineMesh.rotation.y).toBe(0.75);
  });

  test('first person hides mesh and outline', () => {
    character.setViewMode('third');
    character.setViewMode('first');

    expect(character.mesh.visible).toBe(false);
    expect(character.outlineMesh.visible).toBe(false);
  });

  test('ship marker shows skinned mesh on ship; outline only when enabled', () => {
    const ship = makeShip();
    character.showShipModeOutline(character.position, ship);

    expect(character.mesh.visible).toBe(true);
    expect(character.outlineMesh.visible).toBe(false);
    expect(character.mesh.parent).toBe(ship.group);
    expect(character.viewMode).toBe('ship-marker');

    setShowPlayerOutline(true);
    character.showShipModeOutline(character.position, ship);
    expect(character.outlineMesh.visible).toBe(true);
    expect(character.outlineMesh.parent).toBe(ship.group);
  });

  test('hideShipModeOutline restores mesh to world scene', () => {
    const ship = makeShip();
    character.showShipModeOutline(character.position, ship);
    character.hideShipModeOutline();

    expect(character.mesh.visible).toBe(false);
    expect(character.mesh.parent).toBe(scene);
    expect(character.mesh.position.x).toBe(2);
    expect(character.outlineMesh.parent).toBe(scene);
  });

  test('updateMeshPosition syncs outline when enabled in third person', () => {
    setShowPlayerOutline(true);
    character.setViewMode('third');
    character.position = { x: 9, y: 52, z: 1 };
    character.rotation = 1.2;
    character.updateMeshPosition();

    expect(character.outlineMesh.position.x).toBe(9);
    expect(character.outlineMesh.rotation.y).toBe(1.2);
  });
});
