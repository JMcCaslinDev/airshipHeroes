/**
 * Ship-local Minecraft grid collision — axis-aligned boxes in ship space.
 * Visual meshes rotate via ship.group; gameplay collision stays on the grid.
 */

/**
 * Unit AABB for a block at its ship-local cell (matches placement grid).
 * @param {{ position: { x: number, y: number, z: number } }} block
 */
export function getLocalCollisionBox(block) {
  const { x, y, z } = block.position;
  return {
    min: { x: x - 0.5, y: y - 0.5, z: z - 0.5 },
    max: { x: x + 0.5, y: y + 0.5, z: z + 0.5 }
  };
}

export function getShipLocalBlockBoxes(ship) {
  if (!ship?.blockManager?.blocks?.length) {
    return [];
  }
  const seen = new Set();
  // ponytail: collide against all solid blocks even if mesh not parented yet
  return ship.blockManager.blocks
    .filter((block) => block.type !== 'redstone')
    .filter((block) => {
      const { x, y, z } = block.position;
      const key = `${x},${y},${z}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map(getLocalCollisionBox);
}

/**
 * World feet position + displacement → ship-local start + delta.
 */
export function worldMovementToLocal(ship, wx, wy, wz, dx, dy, dz) {
  const transform = ship.transform;
  const start = transform.worldToLocalPosition({ x: wx, y: wy, z: wz });
  const end = transform.worldToLocalPosition({ x: wx + dx, y: wy + dy, z: wz + dz });
  return {
    x: start.x,
    y: start.y,
    z: start.z,
    dx: end.x - start.x,
    dy: end.y - start.y,
    dz: end.z - start.z
  };
}

export function localFeetToWorld(ship, lx, ly, lz) {
  return ship.transform.localToWorldPosition({ x: lx, y: ly, z: lz });
}

/** Feet on top of control / steering block in world space. */
export function getControlBlockFeetWorld(ship) {
  const block = ship.steeringWheel
    ?? ship.blockManager?.blocks?.find((b) => b.type === 'control');
  if (!block) {
    return null;
  }
  const feetLocal = {
    x: block.position.x,
    y: block.position.y + 0.5,
    z: block.position.z
  };
  return ship.transform.localToWorldPosition(feetLocal);
}
