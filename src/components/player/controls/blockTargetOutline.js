/**
 * Minecraft-style black outline on the block the player is looking at.
 */

import * as THREE from 'three';

const OUTLINE_GEOMETRY = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005));
const OUTLINE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.95,
  depthTest: true
});

let outline = null;

export function updateBlockTargetOutline(targetMesh) {
  if (!targetMesh) {
    clearBlockTargetOutline();
    return;
  }

  if (!outline) {
    outline = new THREE.LineSegments(OUTLINE_GEOMETRY, OUTLINE_MATERIAL);
    outline.userData.isBlockTargetOutline = true;
    outline.renderOrder = 3;
    outline.raycast = () => {};
  }

  if (outline.parent !== targetMesh) {
    outline.parent?.remove(outline);
    targetMesh.add(outline);
  }
  outline.visible = true;
}

export function clearBlockTargetOutline() {
  if (!outline) {
    return;
  }
  outline.visible = false;
  outline.parent?.remove(outline);
}
