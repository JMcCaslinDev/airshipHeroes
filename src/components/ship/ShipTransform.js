/**
 * ShipTransform — ship-local grid ↔ world space (uses ship.group matrixWorld).
 */

import * as THREE from 'three';

class ShipTransform {
  constructor(ship) {
    this.ship = ship;
  }

  _inverseWorldMatrix() {
    if (!this.ship.group) {
      return null;
    }
    this.ship.group.updateMatrixWorld(true);
    return new THREE.Matrix4().copy(this.ship.group.matrixWorld).invert();
  }

  localToWorldPosition(localPos) {
    if (this.ship.group) {
      try {
        this.ship.group.updateMatrixWorld(true);
        const vector = new THREE.Vector3(localPos.x, localPos.y, localPos.z);
        vector.applyMatrix4(this.ship.group.matrixWorld);
        return { x: vector.x, y: vector.y, z: vector.z };
      } catch (error) {
        console.error('Error in localToWorldPosition using matrix:', error);
      }
    }

    return this._manualLocalToWorldPosition(localPos);
  }

  worldToLocalPosition(worldPos) {
    const inv = this._inverseWorldMatrix();
    if (inv) {
      const vector = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
      vector.applyMatrix4(inv);
      return { x: vector.x, y: vector.y, z: vector.z };
    }

    return this._manualWorldToLocalPosition(worldPos);
  }

  localToWorldDirection(localDir) {
    if (this.ship.group) {
      this.ship.group.updateMatrixWorld(true);
      const vector = new THREE.Vector3(localDir.x, localDir.y, localDir.z);
      vector.transformDirection(this.ship.group.matrixWorld);
      return { x: vector.x, y: vector.y, z: vector.z };
    }

    return this._manualLocalToWorldDirection(localDir);
  }

  worldToLocalDirection(worldDir) {
    const inv = this._inverseWorldMatrix();
    if (inv) {
      const vector = new THREE.Vector3(worldDir.x, worldDir.y, worldDir.z);
      vector.transformDirection(inv);
      return { x: vector.x, y: vector.y, z: vector.z };
    }

    return this._manualWorldToLocalDirection(worldDir);
  }

  /**
   * Ship-local integer cell for block placement from a raycast hit.
   * Uses hit point + outward normal in ship space (grid rotates with ship).
   * @param {Object} intersection - THREE.Raycaster intersection
   * @returns {{x:number,y:number,z:number}|null}
   */
  computePlacementCellFromIntersection(intersection) {
    if (!intersection?.face || !intersection.object) {
      return null;
    }

    const inv = this._inverseWorldMatrix();
    if (!inv) {
      return null;
    }

    const worldNormal = intersection.face.normal.clone()
      .transformDirection(intersection.object.matrixWorld)
      .normalize();

    const localPoint = intersection.point.clone().applyMatrix4(inv);
    const localNormal = worldNormal.clone().transformDirection(inv).normalize();

    return {
      x: Math.round(localPoint.x + localNormal.x * 0.5),
      y: Math.round(localPoint.y + localNormal.y * 0.5),
      z: Math.round(localPoint.z + localNormal.z * 0.5)
    };
  }

  getForwardDirection() {
    return this.localToWorldDirection({ x: 0, y: 0, z: 1 });
  }

  getRightDirection() {
    return this.localToWorldDirection({ x: 1, y: 0, z: 0 });
  }

  getUpDirection() {
    return { x: 0, y: 1, z: 0 };
  }

  _manualLocalToWorldPosition(localPos) {
    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);

    return {
      x: this.ship.position.x + (localPos.x * cos + localPos.z * sin),
      y: this.ship.position.y + localPos.y,
      z: this.ship.position.z + (-localPos.x * sin + localPos.z * cos)
    };
  }

  _manualWorldToLocalPosition(worldPos) {
    const translatedPos = {
      x: worldPos.x - this.ship.position.x,
      y: worldPos.y - this.ship.position.y,
      z: worldPos.z - this.ship.position.z
    };

    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);

    return {
      x: translatedPos.x * cos - translatedPos.z * sin,
      y: translatedPos.y,
      z: translatedPos.x * sin + translatedPos.z * cos
    };
  }

  _manualLocalToWorldDirection(localDir) {
    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);

    return {
      x: localDir.x * cos + localDir.z * sin,
      y: localDir.y,
      z: -localDir.x * sin + localDir.z * cos
    };
  }

  _manualWorldToLocalDirection(worldDir) {
    const sin = Math.sin(this.ship.rotation);
    const cos = Math.cos(this.ship.rotation);

    return {
      x: worldDir.x * cos - worldDir.z * sin,
      y: worldDir.y,
      z: worldDir.x * sin + worldDir.z * cos
    };
  }
}

export default ShipTransform;
