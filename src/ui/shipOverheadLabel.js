import * as THREE from 'three';
import { getLiftRatio } from '../combat/shipCombat.js';
import { MIN_LIFT_RATIO } from '../combat/shipCombatConfig.js';

const LABEL_WIDTH = 256;
const LABEL_HEIGHT = 56;

/** ponytail: canvas sprite — upgrade path: instanced billboards */
export function paintShipOverheadLabel(canvas, { name, liftRatio }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  const displayName = String(name ?? 'Captain').slice(0, 18);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, LABEL_WIDTH, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayName, LABEL_WIDTH / 2, 14);

  const barX = 14;
  const barW = LABEL_WIDTH - 28;
  const lift = Math.max(0, Math.min(1, liftRatio ?? 0));

  const liftY = 34;
  const liftH = 14;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, liftY, barW, liftH);
  ctx.fillStyle = lift >= MIN_LIFT_RATIO ? '#66bbff' : '#ff5555';
  ctx.fillRect(barX, liftY, Math.round(barW * lift), liftH);
}

export function createShipOverheadLabel(name, parentGroup, y = 7) {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true })
  );
  sprite.scale.set(10, (10 * LABEL_HEIGHT) / LABEL_WIDTH, 1);
  sprite.position.set(0, y, 0);
  sprite.renderOrder = 999;
  sprite.userData.overheadCanvas = canvas;
  sprite.userData.overheadTexture = texture;

  paintShipOverheadLabel(canvas, { name, liftRatio: 1 });
  texture.needsUpdate = true;

  parentGroup.add(sprite);
  return sprite;
}

export function updateShipOverheadLabel(sprite, stats) {
  const canvas = sprite?.userData?.overheadCanvas;
  const texture = sprite?.userData?.overheadTexture;
  if (!canvas || !texture) {
    return;
  }

  paintShipOverheadLabel(canvas, stats);
  texture.needsUpdate = true;
}

export function removeShipOverheadLabel(player) {
  if (player?.overheadLabel?.parent) {
    player.overheadLabel.parent.remove(player.overheadLabel);
  }
  player.overheadLabel = null;
  player.nameLabel = null;
}

export function updateArenaOverheadLabels(gameState) {
  if (gameState?.phase !== 'arena') {
    return;
  }

  for (const player of gameState.players.values()) {
    const ship = player?.ship;
    if (!ship?.group) {
      continue;
    }

    if (!player.overheadLabel) {
      player.overheadLabel = createShipOverheadLabel(player.username, ship.group);
      player.nameLabel = player.overheadLabel;
    }

    if (ship.isDestroyed) {
      player.overheadLabel.visible = false;
      continue;
    }

    player.overheadLabel.visible = true;
    const liftRatio = getLiftRatio(ship);
    ship.liftRatio = liftRatio;

    updateShipOverheadLabel(player.overheadLabel, {
      name: player.username,
      liftRatio
    });
  }
}
