/**
 * Game state module for managing the overall game state
 */

/**
 * Create a game state manager
 * @param {Object} options - Options for the game state
 * @returns {Object} The game state manager
 */
export function createGameState(options = {}) {
  // Game state
  const state = {
    // Player state
    localPlayer: null,
    players: new Map(),
    
    // Game mode
    mode: 'ship', // 'ship' or 'player'
    
    // World state
    world: {
      size: 500, // World size
      height: 500, // World height
      seed: Math.random() * 10000 | 0, // Random seed for world generation
    },
    
    // Projectiles and explosions
    projectiles: [],
    explosions: [],
    
    // UI state
    ui: {
      showHUD: false,
      showInventory: false,
      showChat: false,
      showMenu: false,
      showDebug: false,
    },
    
    // Inventory
    inventory: {
      selectedSlot: 0,
      slots: Array(9).fill().map(() => ({ blockType: null, count: 0 }))
    }
  };
  
  /**
   * Initialize the game state
   */
  function init() {
    // Initialize inventory with some default blocks
    state.inventory.slots[0] = { blockType: 'wood', count: 64 };
    state.inventory.slots[1] = { blockType: 'stone', count: 64 };
    state.inventory.slots[2] = { blockType: 'lift', count: 32 };
    state.inventory.slots[3] = { blockType: 'cannon', count: 16 };
  }
  
  /**
   * Set the local player's username and login
   * @param {string} username - The player's username
   */
  function login(username) {
    if (state.localPlayer) {
      state.localPlayer.username = username;
    }
  }
  
  /**
   * Logout the local player
   */
  function logout() {
    state.localPlayer = null;
    state.players.clear();
    state.projectiles = [];
    state.explosions = [];
  }
  
  /**
   * Add a player to the game
   * @param {Object} player - The player to add
   */
  function addPlayer(player) {
    if (player.username) {
      state.players.set(player.username, player);
      
      // If this is the local player, set it
      if (player.isLocal) {
        state.localPlayer = player;
      }
    }
  }
  
  /**
   * Remove a player from the game
   * @param {string} username - The username of the player to remove
   */
  function removePlayer(username) {
    if (state.players.has(username)) {
      const player = state.players.get(username);
      
      // Clean up player resources
      if (player.ship && player.ship.dispose) {
        player.ship.dispose();
      }
      
      state.players.delete(username);
    }
  }
  
  /**
   * Add a projectile to the game
   * @param {Object} projectile - The projectile to add
   */
  function addProjectile(projectile) {
    state.projectiles.push(projectile);
  }
  
  /**
   * Remove a projectile from the game
   * @param {Object} projectile - The projectile to remove
   */
  function removeProjectile(projectile) {
    const index = state.projectiles.indexOf(projectile);
    if (index !== -1) {
      state.projectiles.splice(index, 1);
    }
  }
  
  /**
   * Add an explosion to the game
   * @param {Object} explosion - The explosion to add
   */
  function addExplosion(explosion) {
    state.explosions.push(explosion);
  }
  
  /**
   * Remove an explosion from the game
   * @param {Object} explosion - The explosion to remove
   */
  function removeExplosion(explosion) {
    const index = state.explosions.indexOf(explosion);
    if (index !== -1) {
      state.explosions.splice(index, 1);
    }
  }
  
  /**
   * Set the local player
   * @param {Object} player - The local player
   */
  function setLocalPlayer(player) {
    state.localPlayer = player;
  }
  
  /**
   * Update the game state
   * @param {number} deltaTime - The time since the last update in seconds
   */
  function update(deltaTime) {
    // Update all players
    state.players.forEach(player => {
      if (player.update) {
        player.update(deltaTime);
      }
    });
    
    // Update all projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const projectile = state.projectiles[i];
      if (projectile.update) {
        projectile.update(deltaTime);
      }
    }
    
    // Update all explosions
    for (let i = state.explosions.length - 1; i >= 0; i--) {
      const explosion = state.explosions[i];
      if (explosion.update) {
        explosion.update(deltaTime);
      }
    }
    
    // Update world
    if (state.world && state.world.update) {
      state.world.update(deltaTime);
    }
  }
  
  return {
    // State getters
    get localPlayer() { return state.localPlayer; },
    get players() { return state.players; },
    get mode() { return state.mode; },
    set mode(value) { state.mode = value; },
    get world() { return state.world; },
    set world(value) { state.world = value; },
    get projectiles() { return state.projectiles; },
    get explosions() { return state.explosions; },
    get ui() { return state.ui; },
    get fps() { return state.fps; },
    set fps(value) { state.fps = value; },
    get inventory() { return state.inventory; },
    
    // Methods
    init,
    login,
    logout,
    addPlayer,
    removePlayer,
    addProjectile,
    removeProjectile,
    addExplosion,
    removeExplosion,
    setLocalPlayer,
    update
  };
} 