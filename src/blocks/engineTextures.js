/**
 * Procedural Raptor 3 engine — lathe body matching side profile; opaque, not a full cube.
 */

import * as THREE from 'three';

const BODY = '#1c1c20';
const BODY_HI = '#34343a';
const SEAM = '#3e3e46';

/** Nozzle center along thrust axis (local -Y before rotation). */
export const ENGINE_NOZZLE_OFFSET = 0.44;

function makeCanvasTexture(drawFn, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawFn(ctx, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Opaque wrap map for lathe body — profile centered, no alpha holes. */
function drawBodyWrap(ctx, size) {
  ctx.fillStyle = BODY;
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const top = size * 0.06;
  const seamY = size * 0.46;
  const bottom = size * 0.94;

  ctx.fillStyle = BODY_HI;
  ctx.fillRect(cx - size * 0.22, top + 4, size * 0.04, seamY - top - 4);

  ctx.strokeStyle = '#2e2e34';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.1, top + 8);
  ctx.lineTo(cx - size * 0.11, seamY - 4);
  ctx.stroke();

  ctx.strokeStyle = '#28282e';
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.14, top + 12);
  ctx.lineTo(cx + size * 0.16, seamY - 8);
  ctx.stroke();

  ctx.fillStyle = SEAM;
  ctx.fillRect(cx - size * 0.26, seamY - 2, size * 0.52, 4);

  ctx.fillStyle = '#18181c';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.24, seamY + 2);
  ctx.lineTo(cx + size * 0.24, seamY + 2);
  ctx.lineTo(cx + size * 0.36, bottom - size * 0.08);
  ctx.lineTo(cx - size * 0.36, bottom - size * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2a2a30';
  ctx.beginPath();
  ctx.ellipse(cx, bottom - size * 0.06, size * 0.36, size * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

let bodyTex;
let templateGeometry;

function getBodyTexture() {
  if (!bodyTex) {
    bodyTex = makeCanvasTexture(drawBodyWrap);
  }
  return bodyTex;
}

function buildEngineProfileGeometry() {
  const points = [
    new THREE.Vector2(0.001, 0.44),
    new THREE.Vector2(0.22, 0.44),
    new THREE.Vector2(0.24, 0.04),
    new THREE.Vector2(0.36, -0.38),
    new THREE.Vector2(0.36, -0.42),
    new THREE.Vector2(0.14, -0.44),
    new THREE.Vector2(0.001, -0.44)
  ];
  const geometry = new THREE.LatheGeometry(points, 32);
  geometry.computeVertexNormals();
  return geometry;
}

export function createRaptorEngineGeometry() {
  if (!templateGeometry) {
    templateGeometry = buildEngineProfileGeometry();
  }
  return templateGeometry.clone();
}

export function createRaptorEngineMaterial() {
  return new THREE.MeshStandardMaterial({
    map: getBodyTexture(),
    metalness: 0.72,
    roughness: 0.38
  });
}

/** ponytail: dispose API kept as array for blockFactory */
export function createRaptorEngineMaterials() {
  return [createRaptorEngineMaterial()];
}

export function disposeRaptorEngineMaterials(materials) {
  if (!Array.isArray(materials)) {
    return;
  }
  new Set(materials).forEach((mat) => mat.dispose());
}

export function resetEngineTextureCache() {
  bodyTex = null;
  templateGeometry?.dispose();
  templateGeometry = null;
}
