import * as THREE from 'three';
import { attachBlockEdges } from '../../../src/blocks/blockEdgeOutline.js';
import {
  updateBlockTargetOutline,
  clearBlockTargetOutline
} from '../../../src/components/player/controls/blockTargetOutline.js';

describe('block outlines', () => {
  test('attachBlockEdges adds non-raycast edge child once', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    attachBlockEdges(mesh);
    attachBlockEdges(mesh);

    const edges = mesh.children.filter((c) => c.userData?.isBlockEdge);
    expect(edges).toHaveLength(1);
    expect(typeof edges[0].raycast).toBe('function');
  });

  test('target outline parents to looked-at mesh', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    updateBlockTargetOutline(mesh);

    expect(mesh.children.some((c) => c.userData?.isBlockTargetOutline)).toBe(true);

    clearBlockTargetOutline();
    expect(mesh.children.some((c) => c.userData?.isBlockTargetOutline)).toBe(false);
  });
});
