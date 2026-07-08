/**
 * Spawn arena AI captains with generated ships and name labels.
 */

import { resolveNpcShipDefinition } from './generateAiShipDefinition.js';
import { updateAiRamControls } from './aiShipController.js';
import { clearShipSinkEffects } from '../combat/sinkingSystem.js';
import { pickArenaSpawn, applySpawnToShip } from '../combat/spawnPlacement.js';
import { resetShipCombatCredit } from '../combat/damageAttribution.js';
import { removeShipOverheadLabel } from '../ui/shipOverheadLabel.js';
import { attachCrewToShip, removeCrewFromShip } from '../ships/shipCrew.js';

export const ARENA_BOT_NAMES = ['Sky Reaver', 'Storm Finch', 'Iron Gale'];

function listRamTargets(gameState) {
  return Array.from(gameState.players.values());
}

function loadBotDefinition(index, deps) {
  return resolveNpcShipDefinition(index, deps.resourceLoader ?? null);
}

function createBotPlayer(username, index, deps) {
  const spawn = pickArenaSpawn();
  const definition = loadBotDefinition(index, deps);
  definition.position = { x: spawn.position.x, y: spawn.position.y, z: spawn.position.z };
  definition.rotation = spawn.rotation;

  const bot = {
    username,
    isLocal: false,
    isBot: true,
    kills: 0,
    deaths: 0,
    mode: 'ship',
    ship: null,
    nameLabel: null,
    update(deltaTime) {
      if (!this.ship) {
        return;
      }
      updateAiRamControls(this.ship, listRamTargets(deps.gameState), deltaTime);
      this.ship.update(deltaTime, 500, deps.gameState?.arenaCombatContext ?? null);
    }
  };

  const ship = deps.loadShipForPlayer(bot, definition);
  if (!ship) {
    return null;
  }

  ship.rotation = spawn.rotation;
  if (ship.group) {
    ship.group.rotation.y = spawn.rotation;
  }
  applySpawnToShip(ship, spawn);
  resetShipCombatCredit(ship);
  attachCrewToShip(ship);

  bot.ship = ship;
  deps.gameState.addPlayer(bot);
  return bot;
}

/**
 * @param {Object} gameState
 * @param {{ loadShipForPlayer: Function }} deps
 */
export function spawnArenaBots(gameState, deps) {
  const spawned = [];

  ARENA_BOT_NAMES.forEach((username, index) => {
    if (gameState.players.has(username)) {
      return;
    }
    const bot = createBotPlayer(username, index, { ...deps, gameState });
    if (bot) {
      spawned.push(bot);
    }
  });

  return spawned;
}

/** Respawn a bot after destruction — keeps the same player entry. */
export function respawnArenaBot(bot, deps) {
  if (!bot?.isBot) {
    return;
  }

  const index = ARENA_BOT_NAMES.indexOf(bot.username);
  if (index < 0) {
    return;
  }

  removeCrewFromShip(bot.ship);
  clearShipSinkEffects(bot.ship, window.renderer?.scene ?? null);
  bot.ship?.group?.parent?.remove(bot.ship.group);
  removeShipOverheadLabel(bot);
  bot.ship = null;

  const spawn = pickArenaSpawn();
  const definition = loadBotDefinition(index, deps);
  definition.position = { x: spawn.position.x, y: spawn.position.y, z: spawn.position.z };
  definition.rotation = spawn.rotation;

  const ship = deps.loadShipForPlayer(bot, definition);
  if (!ship) {
    return;
  }

  ship.rotation = spawn.rotation;
  ship.group.rotation.y = spawn.rotation;
  applySpawnToShip(ship, spawn);
  resetShipCombatCredit(ship);
  attachCrewToShip(ship);
  ship.isDestroyed = false;
  bot.ship = ship;
}
