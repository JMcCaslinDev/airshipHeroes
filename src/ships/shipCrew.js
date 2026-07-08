/**
 * Deck crew mesh — Steve body parented to a ship group.
 * Shared by local spawn pin and NPC captains.
 */

import * as THREE from 'three';
import {
  createSteveSkinCanvas,
  createHeadMaterials,
  createBodyMaterials,
  createArmMaterials,
  createLegMaterials
} from '../components/player/modes/steveSkin.js';

export function getControlFeetLocal(ship) {
  const block = ship?.steeringWheel
    ?? ship?.blockManager?.blocks?.find((b) => b.type === 'control');
  if (block) {
    return {
      x: block.position.x,
      y: block.position.y + 0.5,
      z: block.position.z
    };
  }
  return { x: 0, y: 1, z: 0 };
}

/** Build a lightweight Steve group (no PlayerCharacter state). */
export function createCrewMesh() {
  const skinCanvas = createSteveSkinCanvas();
  const group = new THREE.Group();

  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.75, 0.25),
    createLegMaterials(skinCanvas, false)
  );
  leftLeg.position.set(-0.125, 0.375, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.75, 0.25),
    createLegMaterials(skinCanvas, true)
  );
  rightLeg.position.set(0.125, 0.375, 0);
  group.add(rightLeg);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.75, 0.25),
    createBodyMaterials(skinCanvas)
  );
  body.position.set(0, 1.125, 0);
  group.add(body);

  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.75, 0.25),
    createArmMaterials(skinCanvas, false)
  );
  leftArm.position.set(-0.375, 1.125, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.75, 0.25),
    createArmMaterials(skinCanvas, true)
  );
  rightArm.position.set(0.375, 1.125, 0);
  group.add(rightArm);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    createHeadMaterials(skinCanvas)
  );
  head.position.set(0, 1.75, 0);
  group.add(head);

  group.userData.isCrewMesh = true;
  return group;
}

/**
 * Parent crew to ship at control-block feet (ship-local).
 * @returns {THREE.Object3D|null}
 */
export function attachCrewToShip(ship, existingMesh = null) {
  if (!ship?.group) {
    return null;
  }
  const mesh = existingMesh ?? createCrewMesh();
  const feet = getControlFeetLocal(ship);

  if (mesh.parent && mesh.parent !== ship.group) {
    mesh.parent.remove(mesh);
  }
  if (mesh.parent !== ship.group) {
    ship.group.add(mesh);
  }
  mesh.position.set(feet.x, feet.y, feet.z);
  mesh.rotation.set(0, 0, 0);
  mesh.visible = true;
  ship.crewMesh = mesh;
  return mesh;
}

export function removeCrewFromShip(ship) {
  const mesh = ship?.crewMesh;
  if (mesh?.parent) {
    mesh.parent.remove(mesh);
  }
  if (ship) {
    ship.crewMesh = null;
  }
}
