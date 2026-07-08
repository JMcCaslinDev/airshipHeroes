/**
 * One primary steering wheel (control) per ship.
 * Extra control blocks tint red and can be broken/removed.
 */

export function isControlBlockType(type) {
  return type === 'control' || type === 'steeringWheel' || type === 'steering';
}

export function getControlBlocks(ship) {
  return ship?.blockManager?.blocks?.filter((b) => isControlBlockType(b.type)) ?? [];
}

function tintExtraControl(block) {
  block.isExtraControl = true;
  if (block.mesh?.material?.color) {
    block.mesh.material.color.setHex(0xcc3333);
    if (block.mesh.material.emissive) {
      block.mesh.material.emissive.setHex(0x440000);
      block.mesh.material.emissiveIntensity = 0.35;
    }
  }
}

function clearExtraControlTint(block) {
  block.isExtraControl = false;
  if (block.mesh?.material?.color) {
    block.mesh.material.color.setHex(0x6b4423);
    if (block.mesh.material.emissive) {
      block.mesh.material.emissive.setHex(0x000000);
      block.mesh.material.emissiveIntensity = 0;
    }
  }
}

/**
 * Keep first control as primary steering wheel; mark the rest as removable extras.
 * @returns {number} count of extra control blocks
 */
export function syncControlBlocks(ship) {
  const controls = getControlBlocks(ship);
  if (!controls.length) {
    ship.steeringWheel = null;
    return 0;
  }

  const primary = controls[0];
  ship.steeringWheel = primary;
  clearExtraControlTint(primary);

  for (let i = 1; i < controls.length; i++) {
    tintExtraControl(controls[i]);
  }

  return controls.length - 1;
}

export function canBreakControlBlock(block, options = {}) {
  if (!isControlBlockType(block?.type)) {
    return true;
  }
  if (options.allowBreakingCritical || block.isExtraControl) {
    return true;
  }
  return false;
}
