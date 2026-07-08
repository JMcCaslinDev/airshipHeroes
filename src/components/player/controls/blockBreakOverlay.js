/**
 * Minecraft-style crack overlay on blocks while mining.
 */

import * as THREE from 'three';

const STAGE_COUNT = 10;
const crackTextures = [];

function drawCrackStage(ctx, stage) {
  const w = 64;
  const h = 64;
  ctx.clearRect(0, 0, w, h);
  if (stage <= 0) {
    return;
  }

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.35 + stage * 0.06;

  const lines = stage + 2;
  for (let i = 0; i < lines; i++) {
    const x1 = (i * 17 + stage * 5) % w;
    const y1 = (i * 23) % h;
    const x2 = (x1 + 20 + stage * 3) % w;
    const y2 = (y1 + 25 + stage * 2) % h;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  if (stage >= 4) {
    ctx.beginPath();
    ctx.moveTo(8, 32);
    ctx.lineTo(56, 40);
    ctx.stroke();
  }
  if (stage >= 7) {
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(28, 56);
    ctx.stroke();
  }
}

function getCrackTexture(stage) {
  const index = Math.max(0, Math.min(STAGE_COUNT - 1, stage));
  if (!crackTextures[index]) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawCrackStage(ctx, index);
      crackTextures[index] = new THREE.CanvasTexture(canvas);
    } else {
      // ponytail: jsdom has no 2d canvas — use flat alpha for unit tests
      const data = new Uint8Array([0, 0, 0, Math.min(255, 40 + index * 20)]);
      crackTextures[index] = new THREE.DataTexture(data, 1, 1);
    }
    crackTextures[index].magFilter = THREE.NearestFilter;
    crackTextures[index].minFilter = THREE.NearestFilter;
    crackTextures[index].needsUpdate = true;
  }
  return crackTextures[index];
}

function findCrackOverlay(blockMesh) {
  return blockMesh?.children?.find((child) => child.userData?.isCrackOverlay) ?? null;
}

export function setBlockCrackStage(blockMesh, stage) {
  if (!blockMesh) {
    return;
  }

  let overlay = findCrackOverlay(blockMesh);
  if (stage <= 0) {
    clearBlockCrack(blockMesh);
    return;
  }

  if (!overlay) {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.08,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });
    overlay = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), material);
    overlay.userData.isCrackOverlay = true;
    overlay.renderOrder = 1;
    blockMesh.add(overlay);
  }

  overlay.material.map = getCrackTexture(stage);
  overlay.material.needsUpdate = true;
  overlay.visible = true;
}

export function clearBlockCrack(blockMesh) {
  const overlay = findCrackOverlay(blockMesh);
  if (!overlay) {
    return;
  }
  blockMesh.remove(overlay);
  overlay.geometry?.dispose();
  overlay.material?.dispose();
}
