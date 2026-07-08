/** In-memory streaks + kill feed events for arena UI. */

const streaks = new Map();
let feedHandler = null;

export function setKillFeedHandler(handler) {
  feedHandler = handler;
}

export function resetKillStreaks() {
  streaks.clear();
}

export function getKillStreak(username) {
  return streaks.get(username) ?? 0;
}

export function buildKillFeedEvent(killer, victim) {
  const victimEndedStreak = streaks.get(victim.username) ?? 0;
  streaks.set(victim.username, 0);

  const killerStreak = (streaks.get(killer.username) ?? 0) + 1;
  streaks.set(killer.username, killerStreak);

  return {
    killer: killer.username,
    victim: victim.username,
    killerStreak,
    victimEndedStreak,
    isLocalKill: !!killer.isLocal,
    isLocalDeath: !!victim.isLocal
  };
}

export function emitKillFeed(event) {
  feedHandler?.(event);
}

export function formatKillChatLine(event) {
  if (event.killerStreak >= 2) {
    return `${event.killer} destroyed ${event.victim} (${event.killerStreak} streak)`;
  }
  if (event.victimEndedStreak >= 2) {
    return `${event.killer} ended ${event.victim}'s ${event.victimEndedStreak} streak`;
  }
  return `${event.killer} destroyed ${event.victim}`;
}
