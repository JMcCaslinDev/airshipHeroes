/**
 * Bird's-eye minimap + compass for arena HUD.
 * Map is always ship-centered and heading-up.
 * ponytail: canvas 2d only — upgrade path: shared world texture atlas.
 */

export const MINIMAP_WORLD_RADIUS = 500;
export const MINIMAP_SIZE = 148;
/** Visible radius around the ship (world units) */
export const MINIMAP_VIEW_RADIUS = 180;

/**
 * World (dx, dz) → ship-local map coords with forward = up (-Y on canvas).
 * Physics forward is (sin(θ), cos(θ)) in (x, z).
 */
export function worldDeltaToMap(dx, dz, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  // Rotate by -θ so forward maps to +localZ, then flip for canvas-up
  return {
    x: dx * cos - dz * sin,
    y: -(dx * sin + dz * cos)
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Object} opts
 * @param {{x:number,z:number,rotation?:number}|null} opts.self
 * @param {Array<{x:number,z:number}>} opts.enemies
 */
export function drawMinimap(canvas, { self, enemies = [] } = {}) {
  if (!canvas) {
    return;
  }
  const size = canvas.width || MINIMAP_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const cx = size / 2;
  const cy = size / 2;
  const scale = (size * 0.46) / MINIMAP_VIEW_RADIUS;
  const ox = self?.x ?? 0;
  const oz = self?.z ?? 0;
  const rot = self?.rotation ?? 0;

  ctx.clearRect(0, 0, size, size);

  // Disc background
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12, 28, 22, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 200, 160, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Clip to disc so rotated arena stays inside
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.clip();

  // Arena ring in ship-local space (origin of world relative to ship)
  const origin = worldDeltaToMap(-ox, -oz, rot);
  ctx.beginPath();
  ctx.arc(
    cx + origin.x * scale,
    cy + origin.y * scale,
    MINIMAP_WORLD_RADIUS * scale,
    0,
    Math.PI * 2
  );
  ctx.strokeStyle = 'rgba(80, 140, 110, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Heading-aligned crosshair (forward = up)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.42);
  ctx.lineTo(cx, cy + size * 0.42);
  ctx.moveTo(cx - size * 0.42, cy);
  ctx.lineTo(cx + size * 0.42, cy);
  ctx.stroke();

  for (const e of enemies) {
    const local = worldDeltaToMap(e.x - ox, e.z - oz, rot);
    ctx.beginPath();
    ctx.arc(cx + local.x * scale, cy + local.y * scale, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3344';
    ctx.fill();
  }

  ctx.restore();

  // Self always centered, always pointing up (map rotates under the ship)
  if (self) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 4.5, cy + 5);
    ctx.lineTo(cx - 4.5, cy + 5);
    ctx.closePath();
    ctx.fillStyle = '#66ffcc';
    ctx.fill();
  }
}

/**
 * Compass needle: N stays world-fixed; needle shows ship heading.
 * @param {HTMLElement|null} needleEl
 * @param {HTMLElement|null} labelEl
 * @param {number} shipRotation yaw radians
 */
export function updateCompass(needleEl, labelEl, shipRotation = 0) {
  if (needleEl) {
    const deg = (-shipRotation * 180) / Math.PI;
    needleEl.style.transform = `rotate(${deg}deg)`;
  }
  if (labelEl) {
    let heading = ((shipRotation * 180) / Math.PI) % 360;
    if (heading < 0) {
      heading += 360;
    }
    labelEl.textContent = `${Math.round(heading)}°`;
  }
}
