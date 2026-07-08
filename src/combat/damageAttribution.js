import { recordKill } from './leaderboard.js';
import { buildKillFeedEvent, emitKillFeed, formatKillChatLine } from './killFeed.js';

/** Player-like object with username (local, bot, or remote). */
export function isCombatPlayer(entity) {
  return !!(entity && typeof entity.username === 'string' && entity.username.length > 0);
}

/** Record who last damaged this ship (projectile, ram, explosion, fire). */
export function creditShipDamage(ship, attacker) {
  if (!ship || !isCombatPlayer(attacker)) {
    return;
  }
  const victim = ship.owner;
  if (victim?.username === attacker.username) {
    return;
  }
  ship.lastDamagedBy = attacker;
}

/**
 * Award kill once — on sink start or final destruction.
 * @returns {boolean} kill was newly awarded
 */
export function tryAwardKillCredit(victimShip, hooks = {}) {
  if (!victimShip || victimShip.killAwarded) {
    return false;
  }

  const victim = victimShip.owner;
  const killer = victimShip.lastDamagedBy;
  if (!isCombatPlayer(killer) || !isCombatPlayer(victim) || killer.username === victim.username) {
    return false;
  }

  victimShip.killAwarded = true;
  recordKill(killer.username, victim.username);
  killer.kills = (killer.kills ?? 0) + 1;
  victim.deaths = (victim.deaths ?? 0) + 1;

  const event = buildKillFeedEvent(killer, victim);
  emitKillFeed(event);
  const sunkLine = `${killer.username} sunk ${victim.username}`;
  hooks.onCombatMessage?.(sunkLine);
  hooks.onKillMessage?.(formatKillChatLine(event) ?? sunkLine);
  return true;
}

export function resetShipCombatCredit(ship) {
  if (!ship) {
    return;
  }
  ship.lastDamagedBy = null;
  ship.killAwarded = false;
}
