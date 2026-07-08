import Projectile from '../weapons/projectile.js';

/** Convert a cannon mesh into a tracked Projectile with owner attribution. */
export function registerCannonProjectile(cannonMesh, owner, scene, onExplode) {
  if (!cannonMesh || !scene) {
    return null;
  }

  const vel = cannonMesh.userData?.velocity ?? { x: 0, y: 0, z: 0 };
  const position = {
    x: cannonMesh.position.x,
    y: cannonMesh.position.y,
    z: cannonMesh.position.z
  };

  if (cannonMesh.parent) {
    cannonMesh.parent.remove(cannonMesh);
  }
  cannonMesh.geometry?.dispose?.();
  if (cannonMesh.material) {
    if (Array.isArray(cannonMesh.material)) {
      cannonMesh.material.forEach((m) => m.dispose?.());
    } else {
      cannonMesh.material.dispose?.();
    }
  }

  const projectile = new Projectile({
    position,
    velocity: { ...vel },
    fuseTimer: cannonMesh.userData?.fuseTimer ?? 3,
    owner,
    scene,
    onExplode: (pos, damage, projectileOwner) => onExplode(pos, damage, projectileOwner)
  });

  projectile.createMesh(scene, null);
  return projectile;
}
