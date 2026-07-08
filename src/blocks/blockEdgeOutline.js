/**
 * Dark edge lines on block faces — separates adjacent blocks visually.
 */

import * as THREE from 'three';

const EDGE_GEOMETRY = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
const EDGE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x1a1a1a,
  transparent: true,
  opacity: 0.5
});

export function attachBlockEdges(mesh) {
  if (!mesh || mesh.children?.some((child) => child.userData?.isBlockEdge)) {
    return;
  }

  const edges = new THREE.LineSegments(EDGE_GEOMETRY, EDGE_MATERIAL);
  edges.userData.isBlockEdge = true;
  edges.renderOrder = 1;
  edges.raycast = () => {};
  mesh.add(edges);
}
