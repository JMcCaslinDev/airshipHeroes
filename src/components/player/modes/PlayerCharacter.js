/**
 * PlayerCharacter — Minecraft Steve mesh + ship-mode deck marker.
 */

import * as THREE from 'three';
import {
  PLAYER_HEIGHT,
  PLAYER_HALF_WIDTH
} from '../../../physics/playerMovement.js';
import {
  createSteveSkinCanvas,
  createHeadMaterials,
  createBodyMaterials,
  createArmMaterials,
  createLegMaterials
} from './steveSkin.js';
import { playerVisualConfig } from '../playerVisualConfig.js';

class PlayerCharacter {
  constructor() {
    this.height = PLAYER_HEIGHT;
    this.width = PLAYER_HALF_WIDTH * 2;
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = 0;
    this.isSneaking = false;
    this.isOnGround = false;
    this.isJumping = false;
    this.mesh = null;
    this.headMesh = null;
    this.outlineMesh = null;
    this.worldScene = null;
    this.viewMode = 'first';
    this.shipModeShip = null;
  }

  createMesh(scene) {
    if (!scene) {
      console.error('Scene is undefined in createMesh');
      return;
    }

    try {
      this.worldScene = scene;
      const skinCanvas = createSteveSkinCanvas();

      const group = new THREE.Group();
      const leftLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.75, 0.25),
        createLegMaterials(skinCanvas, false)
      );
      leftLeg.position.set(-0.125, 0.375, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.75, 0.25),
        createLegMaterials(skinCanvas, true)
      );
      rightLeg.position.set(0.125, 0.375, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), createBodyMaterials(skinCanvas));
      body.position.set(0, 1.125, 0);
      body.castShadow = true;
      group.add(body);

      const leftArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.75, 0.25),
        createArmMaterials(skinCanvas, false)
      );
      leftArm.position.set(-0.375, 1.125, 0);
      leftArm.castShadow = true;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.75, 0.25),
        createArmMaterials(skinCanvas, true)
      );
      rightArm.position.set(0.375, 1.125, 0);
      rightArm.castShadow = true;
      group.add(rightArm);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), createHeadMaterials(skinCanvas));
      head.position.set(0, 1.75, 0);
      head.castShadow = true;
      group.add(head);

      this.mesh = group;
      this.headMesh = head;
      this.outlineMesh = this.createOutlineMesh();

      this.updateMeshPosition();
      scene.add(group);
      scene.add(this.outlineMesh);
      group.visible = false;
      this.outlineMesh.visible = false;
    } catch (error) {
      console.error('Error creating character mesh:', error);
    }
  }

  createOutlineMesh() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x55ffaa,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      depthTest: true
    });

    const legGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const leftLeg = new THREE.Mesh(legGeo, mat);
    leftLeg.position.set(-0.125, 0.375, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, mat);
    rightLeg.position.set(0.125, 0.375, 0);
    group.add(rightLeg);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), mat);
    body.position.set(0, 1.125, 0);
    group.add(body);

    const armGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const leftArm = new THREE.Mesh(armGeo, mat);
    leftArm.position.set(-0.375, 1.125, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, mat);
    rightArm.position.set(0.375, 1.125, 0);
    group.add(rightArm);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat);
    head.position.set(0, 1.75, 0);
    group.add(head);

    return group;
  }

  attachToShipGroup(object, ship, localPos) {
    if (!object || !ship?.group) {
      return;
    }
    if (object.parent && object.parent !== ship.group) {
      object.parent.remove(object);
    }
    if (object.parent !== ship.group) {
      ship.group.add(object);
    }
    object.position.set(localPos.x, localPos.y, localPos.z);
  }

  restoreToWorldScene(object) {
    if (!object?.parent || !this.worldScene || object.parent === this.worldScene) {
      return;
    }
    object.parent.remove(object);
    this.worldScene.add(object);
  }

  detachOutlineFromShip() {
    this.restoreToWorldScene(this.outlineMesh);
  }

  detachMeshFromShip() {
    if (!this.mesh) {
      return;
    }
    this.restoreToWorldScene(this.mesh);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.rotation;
  }

  syncOutlineToFeet() {
    if (!this.outlineMesh || !playerVisualConfig.showPlayerOutline) {
      return;
    }
    this.detachOutlineFromShip();
    this.outlineMesh.position.set(this.position.x, this.position.y, this.position.z);
    this.outlineMesh.rotation.y = this.rotation;
  }

  applyOutlineVisibility() {
    if (!this.outlineMesh) {
      return;
    }
    this.outlineMesh.visible =
      playerVisualConfig.showPlayerOutline && this.viewMode !== 'first';
  }

  /**
   * @param {'first'|'third'|'ship-marker'} mode
   */
  setViewMode(mode) {
    this.viewMode = mode;

    if (mode === 'first') {
      if (this.mesh) {
        this.mesh.visible = false;
      }
      this.applyOutlineVisibility();
      return;
    }

    if (mode === 'third') {
      this.detachMeshFromShip();
      if (this.mesh) {
        this.mesh.visible = true;
        this.mesh.rotation.y = this.rotation;
      }
      this.syncOutlineToFeet();
      this.applyOutlineVisibility();
      return;
    }

    // ship-marker: attach + visibility handled by showShipModeOutline
  }

  showShipModeOutline(worldPos, ship) {
    if (!ship?.group || !ship.transform) {
      return;
    }

    this.setViewMode('ship-marker');
    this.shipModeShip = ship;
    const local = ship.transform.worldToLocalPosition(worldPos);

    if (this.outlineMesh && playerVisualConfig.showPlayerOutline) {
      this.attachToShipGroup(this.outlineMesh, ship, local);
      this.outlineMesh.rotation.y = this.rotation;
    }
    this.applyOutlineVisibility();

    if (this.mesh) {
      this.attachToShipGroup(this.mesh, ship, local);
      this.mesh.rotation.y = this.rotation;
      this.mesh.visible = true;
    }
  }

  hideShipModeOutline() {
    this.shipModeShip = null;
    if (this.outlineMesh) {
      this.outlineMesh.visible = false;
      this.detachOutlineFromShip();
    }
    if (this.mesh) {
      this.mesh.visible = false;
      this.detachMeshFromShip();
    }
  }

  updateMeshPosition() {
    if (this.mesh && this.viewMode !== 'ship-marker') {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
      this.mesh.rotation.y = this.rotation;
    }
    if (this.viewMode === 'third') {
      this.syncOutlineToFeet();
    }
  }

  setFirstPersonView(isFirstPerson) {
    this.setViewMode(isFirstPerson ? 'first' : 'third');
  }

  setVisible(visible) {
    if (!visible) {
      if (this.mesh) {
        this.mesh.visible = false;
      }
      if (this.outlineMesh && this.viewMode !== 'ship-marker') {
        this.outlineMesh.visible = false;
      }
      return;
    }

    if (this.viewMode === 'third' || this.viewMode === 'ship-marker') {
      this.setViewMode(this.viewMode);
    }
  }
}

export default PlayerCharacter;
