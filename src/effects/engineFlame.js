/**
 * Directional rocket plume — fire core, flame wisps, trailing smoke.
 */

import * as THREE from 'three';
import { ENGINE_NOZZLE_OFFSET } from '../blocks/engineTextures.js';

const PLUME_HEIGHT = 1.4;
const SMOKE_HEIGHT = 1.85;
const PLUME_MAX_RADIUS = 0.54;

const PLUME_VERTEX_SHADER = `
  varying vec2 vUv;
  varying float vAlong;
  void main() {
    vUv = uv;
    vAlong = position.y / ${PLUME_HEIGHT.toFixed(2)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SMOKE_VERTEX_SHADER = `
  varying vec2 vUv;
  varying float vAlong;
  void main() {
    vUv = uv;
    vAlong = position.y / ${SMOKE_HEIGHT.toFixed(2)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PLUME_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSoftness;
  uniform float uGain;
  varying vec2 vUv;
  varying float vAlong;

  void main() {
    float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;
    radial = pow(clamp(radial, 0.0, 1.0), uSoftness);

    float along = clamp(vAlong, 0.0, 1.0);
    float n1 = sin(vUv.x * 24.0 + uTime * 11.0) * sin(along * 28.0 - uTime * 9.0);
    float n2 = sin(vUv.x * 11.0 - along * 16.0 + uTime * 15.0);
    float turbulence = (n1 + n2) * 0.08;
    float flicker = 0.78 + 0.22 * sin(uTime * 17.0 + along * 13.0 + vUv.x * 6.28);

    vec3 white = vec3(1.0, 0.95, 0.85);
    vec3 orange = vec3(1.0, 0.48, 0.05);
    vec3 hot = vec3(1.0, 0.2, 0.0);
    vec3 blueTip = vec3(0.55, 0.78, 1.0);

    vec3 color = mix(white, orange, smoothstep(0.0, 0.12, along));
    color = mix(color, hot, smoothstep(0.1, 0.45, along + turbulence));
    color = mix(color, blueTip, smoothstep(0.48, 1.0, along + turbulence * 0.5));

    float detail = 0.82 + 0.18 * n1;
    float alpha = radial * mix(1.0, 0.3, along) * flicker * detail;
    if (alpha < 0.03) {
      discard;
    }
    gl_FragColor = vec4(color, alpha * uGain);
  }
`;

const SMOKE_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uGain;
  varying vec2 vUv;
  varying float vAlong;

  void main() {
    float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;
    radial = pow(clamp(radial, 0.0, 1.0), 0.45);

    float along = clamp(vAlong, 0.0, 1.0);
    float roll = sin(vUv.x * 14.0 + along * 20.0 - uTime * 6.0) * 0.5 + 0.5;
    float puff = sin(along * 9.0 - uTime * 4.5) * 0.5 + 0.5;

    vec3 dark = vec3(0.12, 0.12, 0.14);
    vec3 gray = vec3(0.35, 0.36, 0.38);
    vec3 light = vec3(0.55, 0.56, 0.58);

    vec3 color = mix(dark, gray, smoothstep(0.08, 0.35, along));
    color = mix(color, light, smoothstep(0.35, 0.75, along) * (0.6 + 0.4 * roll));

    float alpha = radial * smoothstep(0.05, 0.2, along) * (1.0 - smoothstep(0.7, 1.0, along));
    alpha *= (0.55 + 0.45 * puff) * uGain;
    if (alpha < 0.04) {
      discard;
    }
    gl_FragColor = vec4(color, alpha);
  }
`;

function plumeRadiusAt(t) {
  if (t < 0.1) {
    return 0.88 + 0.12 * (t / 0.1);
  }
  if (t < 0.35) {
    return 1.0 - 0.06 * ((t - 0.1) / 0.25);
  }
  const u = (t - 0.35) / 0.65;
  return (0.94 - 0.08 * u) * (1.0 - Math.pow(u, 1.2));
}

function smokeRadiusAt(t) {
  if (t < 0.15) {
    return 0.45 + 0.55 * (t / 0.15);
  }
  if (t < 0.45) {
    return 1.0 + 0.22 * ((t - 0.15) / 0.3);
  }
  const u = (t - 0.45) / 0.55;
  return (1.15 - 0.2 * u) * (1.0 - Math.pow(u, 0.9));
}

function createPlumeGeometry(radiusScale = 1, height = PLUME_HEIGHT) {
  const points = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * height;
    const r = plumeRadiusAt(t) * PLUME_MAX_RADIUS * radiusScale;
    points.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(points, 22);
}

function createSmokeGeometry(radiusScale = 1) {
  const points = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * SMOKE_HEIGHT;
    const r = smokeRadiusAt(t) * PLUME_MAX_RADIUS * radiusScale;
    points.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(points, 20);
}

function createPlumeMaterial(uniforms, softness, gain) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uSoftness: { value: softness }, uGain: { value: gain } },
    vertexShader: PLUME_VERTEX_SHADER,
    fragmentShader: PLUME_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
}

function createSmokeMaterial(uniforms, gain) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uGain: { value: gain } },
    vertexShader: SMOKE_VERTEX_SHADER,
    fragmentShader: SMOKE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending
  });
}

function orientMeshAlongDirection(mesh, direction) {
  const dir = new THREE.Vector3(direction.x, direction.y, direction.z);
  if (dir.lengthSq() < 0.001) {
    dir.set(0, 0, -1);
  }
  dir.normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
}

/** Nozzle center on the engine face the plume exits from. */
export function getFlameGridPosition(enginePosition, direction) {
  const o = ENGINE_NOZZLE_OFFSET;
  return {
    x: enginePosition.x + direction.x * o,
    y: enginePosition.y + direction.y * o,
    z: enginePosition.z + direction.z * o
  };
}

function createWisp(uniforms, phase) {
  const wisp = new THREE.Mesh(
    createPlumeGeometry(0.38, PLUME_HEIGHT * 0.85),
    createPlumeMaterial(uniforms, 0.65, 0.4)
  );
  wisp.userData.isWisp = true;
  wisp.userData.wispPhase = phase;
  return wisp;
}

export function createEngineFlameMesh(direction = { x: 0, y: 0, z: -1 }) {
  const uniforms = { uTime: { value: 0 } };
  const group = new THREE.Group();
  const parts = [];

  const smokeOuter = new THREE.Mesh(createSmokeGeometry(1.35), createSmokeMaterial(uniforms, 0.42));
  const smokeInner = new THREE.Mesh(createSmokeGeometry(0.95), createSmokeMaterial(uniforms, 0.28));
  parts.push(smokeOuter, smokeInner);

  const halo = new THREE.Mesh(createPlumeGeometry(1.3), createPlumeMaterial(uniforms, 0.32, 0.5));
  const body = new THREE.Mesh(createPlumeGeometry(1.0), createPlumeMaterial(uniforms, 0.5, 0.8));
  const core = new THREE.Mesh(createPlumeGeometry(0.68), createPlumeMaterial(uniforms, 0.85, 1.0));
  parts.push(halo, body, core);

  const wisps = [];
  for (let i = 0; i < 3; i++) {
    const wisp = createWisp(uniforms, (i / 3) * Math.PI * 2);
    wisps.push(wisp);
    parts.push(wisp);
  }

  group.add(...parts);
  orientMeshAlongDirection(group, direction);

  group.userData.isEngineFlame = true;
  group.userData.fireTime = 0;
  group.userData.plumeUniforms = uniforms;
  group.userData.plumeMeshes = parts;
  group.userData.wisps = wisps;
  group.userData.plumeDirection = { ...direction };
  group.renderOrder = 5;
  group.raycast = () => {};
  group.visible = false;
  return group;
}

export function updateEngineFlameMesh(mesh, deltaTime) {
  if (!mesh?.visible) {
    return;
  }
  const time = (mesh.userData.fireTime ?? 0) + deltaTime;
  mesh.userData.fireTime = time;
  const boostGain = mesh.userData.boostGain ?? 1;
  if (mesh.userData.plumeUniforms) {
    mesh.userData.plumeUniforms.uTime.value = time * (boostGain > 1 ? 1.35 : 1);
  }

  // ponytail: bump material gain while boosting — upgrade path: dedicated boost shader
  for (const part of mesh.userData.plumeMeshes ?? []) {
    const gainUniform = part.material?.uniforms?.uGain;
    if (gainUniform && part.userData.baseGain == null) {
      part.userData.baseGain = gainUniform.value;
    }
    if (gainUniform && part.userData.baseGain != null) {
      gainUniform.value = part.userData.baseGain * boostGain;
    }
  }

  for (const wisp of mesh.userData.wisps ?? []) {
    const phase = wisp.userData.wispPhase ?? 0;
    const wobble = boostGain > 1 ? 0.35 : 0.22;
    wisp.rotation.y = phase + Math.sin(time * 4.5 + phase) * wobble;
    wisp.position.x = Math.sin(phase + time * 3.2) * (boostGain > 1 ? 0.18 : 0.1);
    wisp.position.z = Math.cos(phase + time * 3.2) * (boostGain > 1 ? 0.18 : 0.1);
    const scale = 0.9 + Math.sin(time * 8.0 + phase) * 0.12;
    wisp.scale.set(scale, 1.0 + Math.sin(time * 6.0) * 0.08, scale);
  }
}

export function disposeEngineFlameMesh(mesh) {
  if (!mesh) {
    return;
  }
  mesh.parent?.remove(mesh);
  for (const part of mesh.userData?.plumeMeshes ?? [mesh]) {
    part.geometry?.dispose();
    part.material?.dispose();
  }
}
