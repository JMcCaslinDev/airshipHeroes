/**
 * Procedural classic Steve skin (64×64) + per-part face materials.
 */

import * as THREE from 'three';

/** @returns {HTMLCanvasElement} */
export function createSteveSkinCanvas() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  const skin = '#e8b796';
  const hair = '#4a3728';
  const shirt = '#00aaaa';
  const pants = '#4040b0';
  const shoes = '#2a2a2a';
  const eye = '#3d2b1f';
  const mouth = '#8b5a3c';

  const fill = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  // Head — top / bottom / front / back / sides (Minecraft UV layout)
  fill(8, 0, 8, 8, hair);
  fill(16, 0, 8, 8, hair);
  fill(0, 8, 8, 8, skin);
  fill(8, 8, 8, 8, skin);
  fill(16, 8, 8, 8, skin);
  fill(24, 8, 8, 8, hair);
  ctx.fillStyle = eye;
  ctx.fillRect(10, 11, 2, 2);
  ctx.fillRect(14, 11, 2, 2);
  ctx.fillStyle = mouth;
  ctx.fillRect(11, 14, 2, 1);

  // Body
  fill(20, 20, 8, 12, shirt);
  fill(32, 20, 8, 12, shirt);
  fill(16, 20, 4, 12, shirt);
  fill(28, 20, 4, 12, shirt);
  fill(20, 16, 8, 4, shirt);
  fill(28, 16, 8, 4, shirt);

  // Right arm / left arm
  fill(44, 20, 4, 12, shirt);
  fill(48, 20, 4, 12, skin);
  fill(36, 52, 4, 12, shirt);
  fill(40, 52, 4, 12, skin);

  // Right leg / left leg
  fill(4, 20, 4, 12, pants);
  fill(0, 20, 4, 12, pants);
  fill(8, 20, 4, 4, shoes);
  fill(12, 20, 4, 4, shoes);
  fill(4, 52, 4, 12, pants);
  fill(8, 52, 4, 12, pants);

  return canvas;
}

export function createSteveSkinTexture() {
  const canvas = createSteveSkinCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function sliceTexture(skinCanvas, x, y, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skinCanvas, x, y, w, h, 0, 0, w, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function faceMaterial(skinCanvas, x, y, w, h) {
  return new THREE.MeshStandardMaterial({
    map: sliceTexture(skinCanvas, x, y, w, h),
    roughness: 0.9,
    metalness: 0
  });
}

/** Box faces: +x, -x, +y, -y, +z, -z */
export function createHeadMaterials(skinCanvas) {
  return [
    faceMaterial(skinCanvas, 0, 8, 8, 8),
    faceMaterial(skinCanvas, 16, 8, 8, 8),
    faceMaterial(skinCanvas, 8, 0, 8, 8),
    faceMaterial(skinCanvas, 16, 0, 8, 8),
    faceMaterial(skinCanvas, 8, 8, 8, 8),
    faceMaterial(skinCanvas, 24, 8, 8, 8)
  ];
}

export function createBodyMaterials(skinCanvas) {
  return [
    faceMaterial(skinCanvas, 28, 20, 4, 12),
    faceMaterial(skinCanvas, 16, 20, 4, 12),
    faceMaterial(skinCanvas, 20, 16, 8, 4),
    faceMaterial(skinCanvas, 28, 16, 8, 4),
    faceMaterial(skinCanvas, 20, 20, 8, 12),
    faceMaterial(skinCanvas, 32, 20, 8, 12)
  ];
}

export function createArmMaterials(skinCanvas, right = true) {
  const x = right ? 44 : 36;
  const y = right ? 20 : 52;
  return [
    faceMaterial(skinCanvas, x, y, 4, 12),
    faceMaterial(skinCanvas, x, y, 4, 12),
    faceMaterial(skinCanvas, x, y, 4, 12),
    faceMaterial(skinCanvas, x, y, 4, 12),
    faceMaterial(skinCanvas, x, y, 4, 12),
    faceMaterial(skinCanvas, x, y, 4, 12)
  ];
}

export function createLegMaterials(skinCanvas, right = true) {
  const x = right ? 0 : 4;
  const y = right ? 20 : 52;
  return [
    faceMaterial(skinCanvas, x, y, 4, 12),
    faceMaterial(skinCanvas, x, y, 4, 12),
    faceMaterial(skinCanvas, x + 8, y, 4, 4),
    faceMaterial(skinCanvas, x + 8, y, 4, 4),
    faceMaterial(skinCanvas, x, y, 4, 12),
    faceMaterial(skinCanvas, x, y, 4, 12)
  ];
}
