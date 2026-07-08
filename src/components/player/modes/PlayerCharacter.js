/**
 * PlayerCharacter — Minecraft-style Steve mesh + state.
 * Collision uses Steve AABB in playerMovement.js, not mesh bounds.
 */

import * as THREE from 'three';
import {
  PLAYER_HEIGHT,
  PLAYER_HALF_WIDTH
} from '../../../physics/playerMovement.js';

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
    this.firstPersonHiddenMeshes = [];
  }

  /**
   * Build a blocky Steve (group origin = feet).
   */
  createMesh(scene) {
    if (!scene) {
      console.error('Scene is undefined in createMesh');
      return;
    }

    try {
      const group = new THREE.Group();
      const skin = new THREE.MeshStandardMaterial({ color: 0xc69c6c });
      const shirt = new THREE.MeshStandardMaterial({ color: 0x3b7ddb });
      const pants = new THREE.MeshStandardMaterial({ color: 0x3d3d9e });

      const legGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
      const leftLeg = new THREE.Mesh(legGeo, pants);
      leftLeg.position.set(-0.125, 0.375, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pants);
      rightLeg.position.set(0.125, 0.375, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirt);
      body.position.set(0, 1.125, 0);
      body.castShadow = true;
      group.add(body);

      const armGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
      const leftArm = new THREE.Mesh(armGeo, shirt);
      leftArm.position.set(-0.375, 1.125, 0);
      leftArm.castShadow = true;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, shirt);
      rightArm.position.set(0.375, 1.125, 0);
      rightArm.castShadow = true;
      group.add(rightArm);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
      head.position.set(0, 1.75, 0);
      head.castShadow = true;
      group.add(head);

      this.mesh = group;
      this.headMesh = head;
      this.firstPersonHiddenMeshes = [head, rightArm];

      this.updateMeshPosition();
      scene.add(group);
      group.visible = false;
    } catch (error) {
      console.error('Error creating character mesh:', error);
    }
  }

  updateMeshPosition() {
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }
  }

  setFirstPersonView(isFirstPerson) {
    if (this.mesh) {
      this.mesh.visible = !isFirstPerson;
    }
  }

  setVisible(visible) {
    if (this.mesh) {
      this.mesh.visible = visible;
    }
  }
}

export default PlayerCharacter;
