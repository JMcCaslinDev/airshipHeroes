/**
 * ponytail: localStorage kill/death stats per captain name.
 */

const STATS_KEY = 'airshipHeroes_stats';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STATS_KEY, JSON.stringify(data));
}

export function getPlayerStats(username) {
  const all = readAll();
  return all[username] ?? { kills: 0, deaths: 0 };
}

export function recordKill(killerUsername, victimUsername) {
  if (!killerUsername || !victimUsername || killerUsername === victimUsername) {
    return;
  }
  const all = readAll();
  all[killerUsername] = { kills: (all[killerUsername]?.kills ?? 0) + 1, deaths: all[killerUsername]?.deaths ?? 0 };
  all[victimUsername] = { kills: all[victimUsername]?.kills ?? 0, deaths: (all[victimUsername]?.deaths ?? 0) + 1 };
  writeAll(all);
}

export function getLeaderboard(limit = 10) {
  return Object.entries(readAll())
    .map(([username, stats]) => ({ username, kills: stats.kills ?? 0, deaths: stats.deaths ?? 0 }))
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
    .slice(0, limit);
}
