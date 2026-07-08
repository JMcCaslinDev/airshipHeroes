/**
 * Minecraft-style 500×500 ground — hills, paths, forests, forts, huts.
 */

import * as THREE from 'three';

export const GROUND_BASE_Y = 0;
export const LANDSCAPE_HALF_SIZE = 250;

const TYPE_RANK = { dirt: 0, grass: 1, wood: 2, stone: 3, leaves: 4 };

function hash2(x, z, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 982451653);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x, z, seed, octaves = 3, freq = 0.04) {
  let value = 0;
  let amplitude = 1;
  let total = 0;
  let scale = freq;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * scale, z * scale, seed + i * 17) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    scale *= 2;
  }
  return value / total;
}

function makePixelTexture(base, speckle, speckleChance = 0.18) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 64);
  for (let py = 0; py < 64; py += 4) {
    for (let px = 0; px < 64; px += 4) {
      if (hash2(px, py, base.length) < speckleChance) {
        ctx.fillStyle = speckle;
        ctx.fillRect(px, py, 4, 4);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function setVoxel(voxels, x, y, z, type) {
  const key = `${x},${y},${z}`;
  const existing = voxels.get(key);
  if (!existing || TYPE_RANK[type] >= TYPE_RANK[existing]) {
    voxels.set(key, type);
  }
}

export function getGroundColumnHeight(x, z, seed = 42) {
  return Math.floor(fbm(x, z, seed, 4, 0.03) * 3);
}

function nearAxisRoad(coord, spacing, width = 2) {
  const mod = ((coord % spacing) + spacing) % spacing;
  return mod <= width || mod >= spacing - width;
}

/** Main cross, grid roads, and wandering dirt trails */
export function isPathTile(x, z, seed = 42) {
  if (Math.abs(x) <= 2 || Math.abs(z) <= 2) {
    return true;
  }
  if (nearAxisRoad(x, 64) && Math.abs(z) > 6) {
    return true;
  }
  if (nearAxisRoad(z, 64) && Math.abs(x) > 6) {
    return true;
  }
  const trail = fbm(x, z, seed + 99, 2, 0.012);
  return trail > 0.56 && trail < 0.63;
}

export function getFortSites(halfSize = LANDSCAPE_HALF_SIZE, seed = 42) {
  const sites = [];
  const spacing = 72;
  for (let gx = -halfSize + 36; gx <= halfSize - 36; gx += spacing) {
    for (let gz = -halfSize + 36; gz <= halfSize - 36; gz += spacing) {
      if (Math.abs(gx) < 12 && Math.abs(gz) < 12) {
        continue;
      }
      const jitterX = Math.floor((hash2(gx, gz, seed) - 0.5) * 18);
      const jitterZ = Math.floor((hash2(gz, gx, seed + 1) - 0.5) * 18);
      sites.push({
        x: gx + jitterX,
        z: gz + jitterZ,
        variant: Math.floor(hash2(gx, gz, seed + 2) * 3)
      });
    }
  }
  return sites;
}

function placeTree(voxels, x, z, baseY, seed) {
  const trunkH = 3 + Math.floor(hash2(x, z, seed + 3) * 2);
  for (let h = 0; h < trunkH; h++) {
    setVoxel(voxels, x, baseY + h, z, 'wood');
  }
  const crownY = baseY + trunkH;
  for (let dy = 0; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) + Math.abs(dz) + dy > 4 || (dx === 0 && dz === 0 && dy === 0)) {
          continue;
        }
        setVoxel(voxels, x + dx, crownY + dy, z + dz, 'leaves');
      }
    }
  }
}

function fillBox(voxels, x0, y0, z0, x1, y1, z1, type, hollow = false) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        if (hollow && x > x0 && x < x1 && z > z0 && z < z1 && y < y1) {
          continue;
        }
        setVoxel(voxels, x, y, z, type);
      }
    }
  }
}

function placeWallFort(voxels, cx, cz, baseY) {
  const r = 4;
  for (let y = 0; y < 3; y++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const wall = Math.abs(dx) === r || Math.abs(dz) === r;
        const gate = dz === r && Math.abs(dx) <= 1 && y < 2;
        if (!wall || gate) {
          continue;
        }
        setVoxel(voxels, cx + dx, baseY + y, cz + dz, y === 0 ? 'stone' : 'wood');
      }
    }
  }
  for (const [tx, tz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    for (let y = 0; y < 5; y++) {
      setVoxel(voxels, cx + tx, baseY + y, cz + tz, 'stone');
    }
  }
}

function placeWatchtower(voxels, cx, cz, baseY) {
  fillBox(voxels, cx - 1, baseY, cz - 1, cx + 1, baseY + 5, cz + 1, 'stone', true);
  fillBox(voxels, cx - 2, baseY + 4, cz - 2, cx + 2, baseY + 4, cz + 2, 'wood');
  setVoxel(voxels, cx, baseY + 6, cz, 'wood');
}

function placeHut(voxels, cx, cz, baseY) {
  fillBox(voxels, cx - 2, baseY, cz - 2, cx + 2, baseY, cz + 2, 'wood');
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
        for (let y = 1; y <= 3; y++) {
          setVoxel(voxels, cx + dx, baseY + y, cz + dz, 'wood');
        }
      }
    }
  }
  fillBox(voxels, cx - 2, baseY + 4, cz - 2, cx + 2, baseY + 4, cz + 2, 'wood');
  setVoxel(voxels, cx, baseY + 1, cz + 2, 'dirt');
}

function placeStructure(voxels, site, seed) {
  const baseY = getGroundColumnHeight(site.x, site.z, seed) + 1;
  if (site.variant === 0) {
    placeWallFort(voxels, site.x, site.z, baseY);
  } else if (site.variant === 1) {
    placeWatchtower(voxels, site.x, site.z, baseY);
  } else {
    placeHut(voxels, site.x, site.z, baseY);
  }
}

function buildInstancedMesh(positions, material) {
  if (!positions.length) {
    return null;
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach((pos, index) => {
    matrix.makeTranslation(pos.x, pos.y, pos.z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * @param {Object} options
 * @param {number} [options.halfSize] — half of map width (250 = 500×500)
 * @param {number} [options.seed]
 * @param {(name: string) => THREE.Texture|null} [options.getTexture]
 */
export function generateGroundLandscape(options = {}) {
  const halfSize = options.halfSize ?? LANDSCAPE_HALF_SIZE;
  const seed = options.seed ?? 42;
  const getTexture = options.getTexture ?? (() => null);
  const voxels = new Map();

  for (let x = -halfSize; x <= halfSize; x++) {
    for (let z = -halfSize; z <= halfSize; z++) {
      const height = getGroundColumnHeight(x, z, seed);
      const onPath = isPathTile(x, z, seed);
      const inForest = fbm(x, z, seed + 50, 3, 0.025) > 0.45;

      for (let y = GROUND_BASE_Y; y <= GROUND_BASE_Y + height; y++) {
        const isTop = y === GROUND_BASE_Y + height;
        setVoxel(voxels, x, y, z, isTop && !onPath ? 'grass' : 'dirt');
      }

      if (inForest && !onPath && hash2(x, z, seed + 7) > 0.982 && (x + z) % 6 === 0) {
        placeTree(voxels, x, z, GROUND_BASE_Y + height + 1, seed);
      }
    }
  }

  for (const site of getFortSites(halfSize, seed)) {
    placeStructure(voxels, site, seed);
  }

  const buckets = { grass: [], dirt: [], wood: [], stone: [], leaves: [] };
  voxels.forEach((type, key) => {
    const [x, y, z] = key.split(',').map(Number);
    buckets[type].push({ x, y, z });
  });

  const materials = {
    grass: new THREE.MeshStandardMaterial({
      map: makePixelTexture('#5B8731', '#4E7229'),
      roughness: 0.9,
      metalness: 0
    }),
    dirt: new THREE.MeshStandardMaterial({
      map: makePixelTexture('#866043', '#6F4F35'),
      roughness: 0.95,
      metalness: 0
    }),
    wood: new THREE.MeshStandardMaterial({
      map: getTexture('wood') ?? makePixelTexture('#BC986A', '#8B6914', 0.12),
      roughness: 0.85,
      metalness: 0
    }),
    stone: new THREE.MeshStandardMaterial({
      map: getTexture('stone') ?? makePixelTexture('#7F7F7F', '#5A5A5A', 0.14),
      roughness: 0.92,
      metalness: 0
    }),
    leaves: new THREE.MeshStandardMaterial({
      map: makePixelTexture('#3B7A2A', '#2D5E20', 0.22),
      roughness: 0.9,
      metalness: 0
    })
  };

  const group = new THREE.Group();
  group.name = 'GroundLandscape';

  for (const type of ['grass', 'dirt', 'wood', 'stone', 'leaves']) {
    const mesh = buildInstancedMesh(buckets[type], materials[type]);
    if (mesh) {
      mesh.userData.landscapeType = type;
      group.add(mesh);
    }
  }

  return {
    group,
    dispose() {
      group.traverse((child) => {
        if (child.isInstancedMesh) {
          child.geometry.dispose();
          child.material.map?.dispose();
          child.material.dispose();
        }
      });
      group.clear();
    }
  };
}
