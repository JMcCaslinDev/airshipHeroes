import { createExplosion } from '../weapons/explosion.js';
import { recalculateShipHealth } from './shipCombat.js';
import { clearShipSinkEffects } from './sinkingSystem.js';
import { tryAwardKillCredit } from './damageAttribution.js';

/**
 * Handle ship destruction — explosion, kill credit, death flow for owner.
 */
export function destroyShipAt(ship, scene, gameState, hooks) {
  if (!ship || ship.isDestroyed) {
    return;
  }

  ship.isDestroyed = true;
  const victim = ship.owner;
  tryAwardKillCredit(ship, hooks);

  const explosion = createExplosion(scene, { ...ship.position }, { radius: 6, damage: 2 });
  hooks.onShipExplosion?.(explosion, ship.lastDamagedBy ?? null);

  clearShipSinkEffects(ship, scene);

  if (victim?.isLocal) {
    hooks.onLocalDeath?.(victim, ship.lastDamagedBy ?? null);
  } else if (victim?.isBot) {
    hooks.onBotDeath?.(victim);
  }
}

export function respawnPlayer(player, hooks) {
  if (!player) {
    return;
  }
  player.ship?.group?.parent?.remove(player.ship.group);
  player.ship = null;
  hooks.reloadShip?.(player);
  if (player.ship) {
    player.ship.isDestroyed = false;
    player.ship.killAwarded = false;
    player.ship.lastDamagedBy = null;
    recalculateShipHealth(player.ship);
  }
}
