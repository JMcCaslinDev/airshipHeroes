/**
 * Airship Skirmish - Main Entry Point
 * 
 * This file initializes the game, sets up Three.js, and manages the game loop.
 */

// Import modules
import * as THREE from 'three';
import { createRenderer } from './rendering/renderer.js';
import { createGameState } from './core/gameState.js';
import { createGameLoop } from './core/gameLoop.js';
import { createInputHandler } from './input/inputHandler.js';
import { createMultiplayerClient } from './multiplayer/client.js';
import { createResourceLoader } from './resources/resourceLoader.js';
import { createPlayerModeController, createCrosshair } from './modes/playerMode.js';
import { createShipModeController } from './modes/shipMode.js';
import { createUIManager } from './ui/uiManager.js';
import Player from './components/player.js';
import Ship from './components/ship.js';
import Projectile from './weapons/projectile.js';
import { createExplosion, applyExplosionDamage } from './weapons/explosion.js';
import { createShipStorage } from './core/shipStorage.js';
import { createWorldManager } from './core/worldManager.js';
import BlockFactory from './blocks/blockFactory.js';

// Create game objects
const renderer = createRenderer();
// Make renderer accessible globally
window.renderer = renderer;
const gameState = createGameState();
// Make game state accessible globally for mode checking
window.gameState = gameState;
const gameLoop = createGameLoop({
  update: update,
  render: render,
  onFpsUpdate: updateFPS
});
const inputHandler = createInputHandler({
  element: document,
  onModeToggle: toggleMode,
  onMouseMove: (deltaX, deltaY) => {
    if (gameState.mode === 'ship' && shipModeController) {
      shipModeController.handleMouseMove(deltaX, deltaY);
    } else if (gameState.mode === 'player' && playerModeController) {
      playerModeController.handleMouseMove(deltaX, deltaY);
    }
  },
  onMouseDown: (event) => {
    if (gameState.mode === 'player' && playerModeController) {
      playerModeController.handleMouseDown(event);
    }
  },
  onMouseUp: (event) => {
    if (gameState.mode === 'player' && playerModeController?.handleMouseUp) {
      playerModeController.handleMouseUp(event);
    }
  },
  onMouseWheel: (delta) => {
    if (gameState.mode === 'ship' && shipModeController) {
      shipModeController.handleMouseWheel(delta);
    }
  }
});
// Make input handler accessible globally
const resourceLoader = createResourceLoader({
  onProgress: updateLoadingProgress,
  onComplete: onResourcesLoaded
});
const uiManager = createUIManager(gameState, startGame);

// Multiplayer client will be created after login
let multiplayerClient = null;

// Mode controllers
let playerModeController = null;
let shipModeController = null;

// Crosshair for player mode
let crosshair = null;

// Track toggle key state to prevent multiple toggles per press
let lastToggleState = false;

// Initialize ship storage
const shipStorage = createShipStorage();

// Initialize world manager
const worldManager = createWorldManager();

/**
 * Initialize the game
 */
function init() {
  console.log('Initializing Airship Skirmish...');
  
  // Initialize renderer
  renderer.init();
  
  // Initialize game state
  gameState.init();
  
  // Initialize UI manager
  uiManager.init();
  
  // Debug UI elements
  debugUIElements();
  
  // Start loading resources
  resourceLoader.loadAll()
    .then(() => {
      console.log('Resources loaded successfully');
    })
    .catch(error => {
      console.error('Failed to load resources:', error);
    });
  
  // No need to initialize input handler as it's already initialized in createInputHandler
  console.log('Input handler already initialized');
}

/**
 * Debug UI elements
 */
function debugUIElements() {
  console.log('Debugging UI elements:');
  
  const elements = [
    'loading-screen',
    'loading-progress-bar',
    'loading-text',
    'login-screen',
    'login-form',
    'username-input',
    'hud',
    'mode-indicator',
    'fps-counter',
    'inventory',
    'death-screen',
    'respawn-button'
  ];
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    console.log(`Element ${id}: ${element ? 'Found' : 'Not found'}`);
    if (element) {
      console.log(`  Display: ${window.getComputedStyle(element).display}`);
    }
  });
}

/**
 * Update the loading progress
 * @param {Number} progress - The loading progress (0-1)
 */
function updateLoadingProgress(progress) {
  // Update loading progress in UI
  const loadingProgress = document.getElementById('loading-progress-bar');
  if (loadingProgress) {
    loadingProgress.style.width = `${progress * 100}%`;
  }
  
  // Update loading text
  const loadingText = document.getElementById('loading-text');
  if (loadingText) {
    loadingText.textContent = `Loading resources... ${Math.round(progress * 100)}%`;
  }
}

/**
 * Called when all resources are loaded
 */
function onResourcesLoaded() {
  console.log("All resources loaded successfully");
  
  // Make resource loader globally available
  window.resourceLoader = resourceLoader;
  
  // Hide loading screen
  uiManager.hideLoadingScreen();
  
  // Show login screen
  uiManager.showLoginScreen();
  
  // Also directly manipulate the DOM as a fallback
  const loadingScreen = document.getElementById('loading-screen');
  const loginScreen = document.getElementById('login-screen');
  
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
    console.log('Loading screen hidden directly');
  }
  
  if (loginScreen) {
    loginScreen.style.display = 'flex';
    console.log('Login screen shown directly');
  }
  
  // Create ground
  renderer.createGround();
  
  // Create skybox
  renderer.createSkybox();
  
  // Fix texture issues on all ships if any exist
  if (gameState && gameState.ships) {
    console.log("Fixing texture issues on all ships...");
    gameState.ships.forEach(ship => {
      if (ship && typeof ship.fixBlockTextureIssues === 'function') {
        const fixedCount = ship.fixBlockTextureIssues();
        console.log(`Fixed textures for ${fixedCount} blocks on ship ${ship.name || 'unnamed'}`);
      }
    });
  }
}

/**
 * Start the game
 * @param {string} username - The player's username
 */
function startGame(username) {
  try {
    console.log(`Starting game for ${username}...`);
    
    // Set username in game state
    gameState.login(username);
    console.log('Username set in game state');

    // CRITICAL: Set renderer's z-index programmatically to ensure it's below UI
    try {
      const canvasElement = document.getElementById('game-canvas');
      if (canvasElement) {
        canvasElement.style.zIndex = '1';
        console.log('Set canvas z-index to 1');
      }
    } catch (e) {
      console.error('Failed to set canvas z-index:', e);
    }
    
    // Create local player
    const localPlayer = new Player({
      id: 'local',
      username: username,
      isLocal: true,
      position: { x: 0, y: 50, z: 0 },
      shipStorage: shipStorage
    });
    console.log('Local player created');
    
    // Initialize player with scene and camera
    localPlayer.init(renderer.scene, renderer.camera);
    console.log('Player initialized');
    
    // Add player to game state
    gameState.setLocalPlayer(localPlayer);
    gameState.addPlayer(localPlayer);
    console.log('Player added to game state');
    
    // Try to load saved ship
    let shipLoaded = false;
    try {
      if (shipStorage && shipStorage.shipExists(username)) {
        const savedShip = shipStorage.loadShip(username);
        
        if (savedShip && savedShip.blocks && Array.isArray(savedShip.blocks) && savedShip.blocks.length > 0) {
          console.log(`Loaded saved ship for user: ${username} with ${savedShip.blocks.length} blocks`);
          const ship = loadShipForPlayer(localPlayer, savedShip);
          if (ship && ship.blockManager.blocks && ship.blockManager.blocks.length > 0) {
            console.log(`Ship loaded successfully with ${ship.blockManager.blocks.length} blocks`);
            shipLoaded = true;
          } else {
            console.error('Ship loaded but has no blocks, falling back to default ship');
          }
        } else {
          console.warn('Saved ship is invalid or empty, falling back to default ship');
        }
      } else {
        console.log(`No saved ship found for user: ${username}, loading default ship`);
      }
    } catch (error) {
      console.error('Error loading saved ship:', error);
    }
    
    // Load default ship if saved ship couldn't be loaded
    if (!shipLoaded) {
      console.log('Loading default ship');
      loadDefaultShip(localPlayer);
    }
    
    // Add debug helpers to scene
    addSceneDebugHelpers();
    console.log('Debug helpers added to scene');
    
    // Create mode controllers
    try {
      shipModeController = createShipModeController(localPlayer, renderer.camera, worldManager);
      playerModeController = createPlayerModeController(localPlayer, renderer.camera);
      console.log('Mode controllers created');
      
      // Clear any existing crosshair elements before creating new ones
      const oldCrosshair = document.getElementById('crosshair');
      if (oldCrosshair && oldCrosshair.parentNode) {
        oldCrosshair.parentNode.removeChild(oldCrosshair);
      }
      
      const oldContainer = document.getElementById('crosshair-container');
      if (oldContainer && oldContainer.parentNode) {
        oldContainer.parentNode.removeChild(oldContainer);
      }
      
      // Create crosshair for player mode
      crosshair = createCrosshair();
      console.log('Fresh crosshair created at game start');
      
      // Start in ship mode
      gameState.mode = 'ship';
      shipModeController.activate();
      console.log('Ship mode activated');
      
      // Hide crosshair in ship mode
      if (crosshair) {
        crosshair.hide();
        console.log('Crosshair hidden for initial ship mode');
      }
      
      // Force camera position update
      renderer.camera.position.set(0, 60, 20);
      renderer.camera.lookAt(0, 50, 0);
      console.log('Camera position forced to:', renderer.camera.position);
    } catch (error) {
      console.error('Error creating mode controllers:', error);
    }
    
    // Create multiplayer client
    try {
      multiplayerClient = createMultiplayerClient({
        gameState,
        onConnect: () => {
          console.log('Connected to multiplayer server');
          uiManager.showNotification('Connected to server');
        },
        onDisconnect: () => {
          console.log('Disconnected from multiplayer server');
          uiManager.showNotification('Disconnected from server - Playing in offline mode');
          
          // Continue with the game in offline mode
          if (!gameLoop.isRunning) {
            gameLoop.start();
          }
        },
        onPlayerJoin: handlePlayerJoin,
        onPlayerLeave: handlePlayerLeave,
        onPlayerUpdate: handlePlayerUpdate,
        onProjectileFired: handleProjectileFired,
        onBlockPlaced: handleBlockPlaced,
        onBlockRemoved: handleBlockRemoved,
        onWorldState: handleWorldState,
        onShipUpdate: handleShipUpdate
      });
      console.log('Multiplayer client created');
      
      // Connect to server
      multiplayerClient.connect();
      console.log('Connecting to server...');
    } catch (error) {
      console.error('Error creating multiplayer client:', error);
      uiManager.showNotification('Failed to connect to server - Playing in offline mode');
    }
    
    // Show HUD
    uiManager.showHUD();
    console.log('HUD shown');
    
    // Start game loop
    try {
      gameLoop.start();
      console.log('Game loop started');
    } catch (error) {
      console.error('Error starting game loop:', error);
    }
  } catch (error) {
    console.error('Error starting game:', error);
  }
}

/**
 * Add debug helpers to the scene
 */
function addSceneDebugHelpers() {
  try {
    // Add axes helper to show world orientation
    const axesHelper = new THREE.AxesHelper(20);
    renderer.scene.add(axesHelper);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 10);
    renderer.scene.add(gridHelper);
    
    // Add camera helper
    const cameraHelper = new THREE.CameraHelper(renderer.camera);
    renderer.scene.add(cameraHelper);
    
    console.log('Debug helpers added to scene');
  } catch (error) {
    console.error('Error adding scene debug helpers:', error);
  }
}

/**
 * Ensure a ship is properly added to the scene and visible
 * @param {Object} ship - The ship to ensure is in the scene
 */
function ensureShipInScene(ship) {
  if (!ship) {
    console.error('Ship is null, cannot add to scene');
    return;
  }
  
  if (!ship.group) {
    console.error('Ship group is null, cannot add to scene');
    return;
  }
  
  console.log('Ensuring ship is in scene and visible');
  
  // Use the ship's ensureVisible method
  if (renderer && renderer.scene) {
    ship.ensureVisible(renderer.scene);
  } else {
    console.error('Cannot ensure ship visibility: renderer or scene is null');
  }
  
  console.log(`Ship position: ${JSON.stringify(ship.position)}`);
  console.log(`Ship group position: ${JSON.stringify({
    x: ship.group.position.x,
    y: ship.group.position.y,
    z: ship.group.position.z
  })}`);
  
  // Log the number of children in the ship group
  console.log(`Ship group has ${ship.group.children.length} children`);
  
  // Verify that the ship is actually visible
  if (ship.group.children.length === 0) {
    console.warn('Ship group has no children, ship may not be visible');
  }
}

/**
 * Replace the player's ship and ensure the new one is in the scene.
 * @param {Object} player - The player
 * @param {Object} ship - The new ship
 * @returns {Object|null} The new ship
 */
function replacePlayerShip(player, ship) {
  if (!player || !ship) {
    return null;
  }

  if (player.ship?.group?.parent) {
    player.ship.group.parent.remove(player.ship.group);
  }

  player.ship = ship;
  ship.worldManager = worldManager;
  ensureShipInScene(ship);
  return ship;
}

/**
 * Load a ship for a player from a ship definition
 * @param {Object} player - The player to load the ship for
 * @param {Object} shipDefinition - The ship definition to load
 * @returns {Object} The loaded ship
 */
function loadShipForPlayer(player, shipDefinition) {
  try {
    if (!player) {
      console.error('Cannot load ship: player is null');
      return null;
    }
    
    if (!shipDefinition || !shipDefinition.blocks || !Array.isArray(shipDefinition.blocks) || shipDefinition.blocks.length === 0) {
      console.error('Cannot load ship: invalid ship definition', shipDefinition);
      return null;
    }
    
    console.log(`Loading saved ship for ${player.username}`, {
      blockCount: shipDefinition.blocks.length,
      position: shipDefinition.position
    });
    
    // Create a new ship
    const ship = new Ship({
      owner: player,
      position: shipDefinition.position || { x: 0, y: 50, z: 0 },
      name: shipDefinition.name || 'Saved Ship'
    });
    
    // Load the ship from the definition
    ship.loadFromDefinition(shipDefinition);
    
    // Verify the ship has blocks
    if (!ship.blockManager.blocks || ship.blockManager.blocks.length === 0) {
      console.error('Ship loaded but has no blocks');
      return null;
    }
    
    console.log(`Ship loaded with ${ship.blockManager.blocks.length} blocks`);
    
    // Ensure the ship is visible and in the scene
    ensureShipInScene(ship);
    
    // Set the ship for the player
    replacePlayerShip(player, ship);
    
    // Add debug helpers
    addDebugHelpers(ship);
    
    console.log('Saved ship loaded successfully');
    
    return ship;
  } catch (error) {
    console.error('Error loading saved ship:', error);
    
    // Fall back to default ship
    console.log('Falling back to default ship');
    return loadDefaultShip(player);
  }
}

/**
 * Load the default ship for a player
 * @param {Object} player - The player to load the ship for
 */
function loadDefaultShip(player) {
  try {
    if (!player) {
      console.error('Cannot load default ship: player is null');
      return null;
    }
    
    console.log(`Loading default ship for ${player.username}`);
    
    // Create a new ship
    const ship = new Ship({
      owner: player,
      position: { x: 0, y: 50, z: 0 },
      name: 'Default Ship'
    });
    
    // Try to load the default ship definition
    let defaultShipDefinition = null;
    try {
      defaultShipDefinition = resourceLoader.getShipDefinition('default');
    } catch (error) {
      console.error('Error loading default ship definition:', error);
    }
    
    // If we have a valid default ship definition, use it
    if (defaultShipDefinition && defaultShipDefinition.blocks && 
        Array.isArray(defaultShipDefinition.blocks) && defaultShipDefinition.blocks.length > 0) {
      console.log('Loading ship from default definition');
      ship.loadFromDefinition(defaultShipDefinition);

      if (!ship.blockManager.blocks || ship.blockManager.blocks.length === 0) {
        console.warn('Default ship definition produced no blocks, using built-in fallback');
        return createFallbackShip(player);
      }
    } else {
      // Otherwise, create a simple fallback ship
      console.warn('No valid default ship definition found, creating fallback ship');
      return createFallbackShip(player);
    }
    
    replacePlayerShip(player, ship);
    
    // Add debug helpers
    addDebugHelpers(ship);
    
    console.log(`Default ship loaded successfully with ${ship.blockManager.blocks.length} blocks`);
    
    return ship;
  } catch (error) {
    console.error('Error loading default ship:', error);
    
    // Create a fallback ship as a last resort
    console.warn('Creating fallback ship due to error');
    return createFallbackShip(player);
  }
}

/**
 * Add debug helpers to visualize the ship
 * @param {Ship} ship - The ship to add helpers to
 */
function addDebugHelpers(ship) {
  try {
    // Add axes helper to show ship orientation
    const axesHelper = new THREE.AxesHelper(10);
    ship.group.add(axesHelper);
    
    // Add bounding box helper
    const box = new THREE.Box3().setFromObject(ship.group);
    const boxHelper = new THREE.Box3Helper(box, 0xffff00);
    renderer.scene.add(boxHelper);
    
    console.log('Debug helpers added to ship');
  } catch (error) {
    console.error('Error adding debug helpers:', error);
  }
}

/**
 * Create a fallback ship for a player when no other ship is available
 * @param {Object} player - The player to create the ship for
 */
function createFallbackShip(player) {
  console.log('Creating fallback ship');
  
  try {
    if (!player) {
      console.error('Cannot create fallback ship: player is null');
      return null;
    }
    
    // Create a new ship
    const ship = new Ship({
      owner: player,
      position: { x: 0, y: 50, z: 0 },
      name: 'Fallback Ship'
    });
    
    // Make sure the ship group is added to the scene
    if (renderer && renderer.scene) {
      ship.ensureVisible(renderer.scene);
    } else {
      console.error('Cannot add ship group to scene: renderer or scene is null');
    }
    
    // Create a simple ship with a control block, lift blocks, and engine blocks
    const blocks = [
      // Control block at the center
      { type: 'control', position: { x: 0, y: 0, z: 0 } },
      
      // Lift blocks to ensure the ship doesn't sink
      { type: 'lift', position: { x: 1, y: 0, z: 0 } },
      { type: 'lift', position: { x: -1, y: 0, z: 0 } },
      { type: 'lift', position: { x: 0, y: 0, z: 1 } },
      { type: 'lift', position: { x: 0, y: 0, z: -1 } },
      
      // Engine blocks for movement
      { type: 'engine', position: { x: 2, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } },  // Right engine
      { type: 'engine', position: { x: -2, y: 0, z: 0 }, direction: { x: -1, y: 0, z: 0 } }, // Left engine
      { type: 'engine', position: { x: 0, y: 0, z: 2 }, direction: { x: 0, y: 0, z: 1 } },  // Back engine
      { type: 'engine', position: { x: 0, y: 0, z: -2 }, direction: { x: 0, y: 0, z: -1 } }, // Front engine
      
      // Wood blocks for structure
      { type: 'wood', position: { x: 1, y: 0, z: 1 } },
      { type: 'wood', position: { x: -1, y: 0, z: 1 } },
      { type: 'wood', position: { x: 1, y: 0, z: -1 } },
      { type: 'wood', position: { x: -1, y: 0, z: -1 } }
    ];
    
    // Create blocks and add to ship
    for (const blockData of blocks) {
      try {
        // Create the block with direction if it's an engine
        const block = BlockFactory.createBlock(
          blockData.type, 
          blockData.position,
          blockData.direction ? { direction: blockData.direction } : undefined
        );
        
        if (block) {
          // Add the block to the ship using the blockManager
          ship.blockManager.addBlock(block, resourceLoader);
          
          // If it's a steering wheel or control block, store a reference
          if (blockData.type === 'control' || blockData.type === 'steeringWheel') {
            ship.steeringWheel = block;
          }
          
          // Verify the block has a mesh
          if (!block.mesh) {
            console.error(`Block of type ${blockData.type} has no mesh after adding to ship`);
          } else {
            console.log(`Added ${blockData.type} block to fallback ship with mesh`);
          }
        }
      } catch (blockError) {
        console.error(`Error creating ${blockData.type} block:`, blockError);
      }
    }
    
    // Check if we successfully created any blocks
    if (ship.blockManager.blocks.length === 0) {
      console.error('Failed to create any blocks for fallback ship');
      return null;
    }
    
    console.log(`Created fallback ship with ${ship.blockManager.blocks.length} blocks`);
    
    // Force update the ship's renderer
    ship.renderer.updateBlockMeshes();
    
    replacePlayerShip(player, ship);
    
    // Add debug helpers
    addDebugHelpers(ship);
    
    console.log('Fallback ship created successfully');
    
    return ship;
  } catch (error) {
    console.error('Error creating fallback ship:', error);
    return null;
  }
}

/**
 * Handle player join event
 * @param {Object} data - Player data
 */
function handlePlayerJoin(data) {
  console.log(`Player joined: ${data.username}`);
  
  // Create new player
  const player = new Player({
    username: data.username
  });
  
  // Initialize player (without camera)
  player.init(renderer.scene, null);
  
  // Create ship
  player.ship = new Ship({
    owner: player,
    position: { x: 0, y: 50, z: 0 } // Lower the ship position
  });
  
  // Load default ship
  try {
    loadDefaultShip(player);
  } catch (error) {
    console.error('Error loading default ship for joined player:', error);
  }
  
  // Add player to game state
  gameState.addPlayer(player);
}

/**
 * Handle player leave event
 * @param {Object} data - Player data
 */
function handlePlayerLeave(data) {
  console.log(`Player left: ${data.username}`);
  
  // Remove player from game state
  gameState.removePlayer(data.username);
}

/**
 * Handle player update event
 * @param {Object} data - Player update data
 */
function handlePlayerUpdate(data) {
  // Get player from game state
  const player = gameState.players[data.username];
  
  if (player) {
    // Update ship position and rotation
    if (player.ship) {
      player.ship.position = data.shipPosition;
      player.ship.rotation = data.shipRotation;
      
      // Update ship group
      if (player.ship.group) {
        player.ship.group.position.set(
          data.shipPosition.x,
          data.shipPosition.y,
          data.shipPosition.z
        );
        player.ship.group.rotation.y = data.shipRotation;
      }
    }
    
    // Update player mode
    player.mode = data.mode;
    
    // Update character position if in Player Mode
    if (data.mode === 'player' && player.character) {
      player.character.position = data.characterPosition;
      player.character.rotation = data.characterRotation;
      
      // Update character mesh
      if (player.character.mesh) {
        player.character.mesh.position.set(
          data.characterPosition.x,
          data.characterPosition.y,
          data.characterPosition.z
        );
        player.character.mesh.rotation.y = data.characterRotation;
        player.character.mesh.visible = true;
      }
    } else if (player.character && player.character.mesh) {
      // Hide character mesh in Ship Mode
      player.character.mesh.visible = false;
    }
    
    // Update stats
    player.kills = data.kills;
    player.deaths = data.deaths;
  }
}

/**
 * Handle projectile fired event
 * @param {Object} data - Projectile data
 */
function handleProjectileFired(data) {
  // Create projectile
  const projectile = new Projectile({
    position: data.position,
    velocity: data.velocity,
    fuseTimer: data.fuseTimer,
    owner: gameState.players[data.username],
    onExplode: handleProjectileExplode
  });
  
  // Create mesh
  projectile.createMesh(renderer.scene, resourceLoader.textureLoader);
  
  // Add to game state
  gameState.addProjectile(projectile);
}

/**
 * Handle projectile explosion
 * @param {Object} position - The position of the explosion
 * @param {Number} damage - The damage amount
 */
function handleProjectileExplode(position, damage) {
  // Create explosion
  const explosion = createExplosion(renderer.scene, position, {
    radius: 3,
    damage: damage
  });
  
  // Add to game state
  gameState.addExplosion(explosion);
  
  // Apply damage to nearby blocks
  for (const player of Object.values(gameState.players)) {
    if (player.ship) {
      applyExplosionDamage(explosion, player.ship.blockManager.blocks);
    }
  }
}

/**
 * Toggle between Ship Mode and Player Mode
 */
function toggleMode() {
  console.log('Toggling mode from', gameState.mode);
  
  if (gameState.mode === 'ship') {
    // Switch to player mode
    gameState.mode = 'player';
    shipModeController.deactivate();
    playerModeController.activate();
    
    // CRITICAL: Always recreate the crosshair from scratch when entering player mode
    console.log('Creating authentic Minecraft crosshair for player mode');
    
    // First, clean up any existing crosshair
    if (crosshair) {
      crosshair.destroy();
      crosshair = null;
    }
    
    // Remove any stray elements that might be left
    const oldCrosshair = document.getElementById('crosshair');
    if (oldCrosshair && oldCrosshair.parentNode) {
      oldCrosshair.parentNode.removeChild(oldCrosshair);
    }
    
    const oldContainer = document.getElementById('crosshair-container');
    if (oldContainer && oldContainer.parentNode) {
      oldContainer.parentNode.removeChild(oldContainer);
    }
    
    // Create fresh Minecraft-style crosshair
    crosshair = createCrosshair();
    
    // Force it to be visible immediately and again after a short delay
    crosshair.show();
    
    // Also set a timeout as a fail-safe to ensure it appears
    setTimeout(() => {
      if (crosshair) {
        crosshair.show();
        console.log('Minecraft crosshair forced visible with timeout');
      }
    }, 50); // Shorter delay is enough
  } else {
    // Switch to ship mode
    gameState.mode = 'ship';
    playerModeController.deactivate();
    shipModeController.activate();
    
    // Hide crosshair in ship mode
    if (crosshair) {
      console.log('Hiding crosshair for ship mode');
      crosshair.hide();
    }
  }
  
  // Update UI
  uiManager.updateModeIndicator(gameState.mode);
  console.log('Mode toggled to', gameState.mode);
}

/**
 * Update the FPS counter
 * @param {Number} fps - The current FPS
 */
function updateFPS(fps) {
  // Update the game state FPS
  gameState.fps = fps;
  
  // Update the UI
  if (uiManager && typeof uiManager.updateFPSCounter === 'function') {
    uiManager.updateFPSCounter();
  }
}

/**
 * Update the game state
 * @param {Number} deltaTime - Time since last frame in seconds
 */
function update(deltaTime) {
  try {
    // Update game state
    try {
      gameState.update(deltaTime);
    } catch (error) {
      console.error('Error updating game state:', error);
    }
    
    // Update local player
    if (gameState.localPlayer) {
      // Check for mode toggle
      if (inputHandler) {
        const toggleState = inputHandler.keys.toggleMode;
        
        if (toggleState && !lastToggleState) {
          toggleMode();
        }
        
        lastToggleState = toggleState;
      }
      
      // Keep PlayerControls state in sync with the central input handler
      gameState.localPlayer.syncControlsFromInput(inputHandler.keys);

      // Update controllers based on mode
      try {
        if (gameState.mode === 'ship' && shipModeController) {
          // Ship mode
          shipModeController.handleInput(inputHandler.keys);
          shipModeController.update(deltaTime);
          
          // Ensure crosshair is hidden in ship mode
          if (crosshair) {
            crosshair.hide();
          }
        } else if (gameState.mode === 'player' && playerModeController) {
          // Player mode
          playerModeController.handleInput(inputHandler.keys);
          playerModeController.update(deltaTime);
          
          // Ensure crosshair is visible in player mode
          if (crosshair) {
            crosshair.show();
            
            // Check if crosshair exists and is visible
            const crosshairElement = document.getElementById('crosshair');
            if (!crosshairElement) {
              console.log('Crosshair not found in DOM during update, recreating...');
              if (crosshair) {
                crosshair.destroy(); // Clean up any existing instance
              }
              crosshair = createCrosshair();
              crosshair.show();
            } else if (crosshairElement.style.display !== 'block') {
              console.log('Crosshair exists but not visible, showing it...');
              crosshairElement.style.display = 'block';
              crosshairElement.style.visibility = 'visible';
              crosshairElement.style.opacity = '1';
            }
          }
          
          // Check if blocks were placed or broken and save the ship
          if (playerModeController.blocksChanged) {
            savePlayerShip(gameState.localPlayer);
            playerModeController.blocksChanged = false;
          }
        }
      } catch (error) {
        console.error('Error updating mode controller:', error);
      }
      
      // Update player
      try {
        gameState.localPlayer.update(deltaTime, renderer.scene);
      } catch (error) {
        console.error('Error updating player:', error);
      }
    }
    
    // Update multiplayer client
    if (multiplayerClient) {
      try {
        multiplayerClient.update(deltaTime);
      } catch (error) {
        console.error('Error updating multiplayer client:', error);
      }
    }
    
    // Update projectiles
    try {
      for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const projectile = gameState.projectiles[i];
        projectile.update(deltaTime);
        
        if (projectile.isDead) {
          gameState.removeProjectile(projectile);
        }
      }
    } catch (error) {
      console.error('Error updating projectiles:', error);
    }
    
    // Update explosions
    try {
      for (let i = gameState.explosions.length - 1; i >= 0; i--) {
        const explosion = gameState.explosions[i];
        explosion.update(deltaTime);
        
        if (explosion.isDead) {
          gameState.removeExplosion(explosion);
        }
      }
    } catch (error) {
      console.error('Error updating explosions:', error);
    }
    
    // Update UI
    try {
      uiManager.update();
    } catch (error) {
      console.error('Error updating UI:', error);
    }
  } catch (error) {
    console.error('Error in update loop:', error);
  }
}

/**
 * Render the scene
 */
function render() {
  try {
    // Log camera position periodically (every 100 frames)
    if (Math.random() < 0.01) {
      console.log('Camera position during render:', renderer.camera.position);
      console.log('Camera rotation during render:', renderer.camera.rotation);
      
      if (gameState.localPlayer && gameState.localPlayer.ship) {
        console.log('Ship position during render:', gameState.localPlayer.ship.position);
        console.log('Ship group visible:', gameState.localPlayer.ship.group.visible);
        console.log('Ship blocks count:', gameState.localPlayer.ship.blockManager.blocks.length);
        
        // Log the first few blocks
        const blocksToLog = gameState.localPlayer.ship.blockManager.blocks.slice(0, 3);
        console.log('Sample blocks:', blocksToLog.map(block => ({
          type: block.type,
          position: block.position,
          visible: block.mesh ? block.mesh.visible : 'no mesh'
        })));
      }
    }
    
    // Render the scene
    renderer.render();
  } catch (error) {
    console.error('Error in render function:', error);
  }
}

/**
 * Save the player's ship to localStorage
 * @param {Player} player - The player whose ship to save
 */
function savePlayerShip(player) {
  if (!player || !player.ship) {
    console.warn("Cannot save ship: player or ship is null");
    return;
  }
  
  try {
    // Get ship definition using serialize method
    const shipDefinition = player.ship.serialize();
    
    if (!shipDefinition) {
      console.error("Ship serialization failed");
      return;
    }
    
    console.log(`Saving ship for ${player.username}`, {
      blockCount: shipDefinition.blocks.length,
      position: shipDefinition.position
    });
    
    // Save to localStorage
    if (shipStorage) {
      const saved = shipStorage.saveShip(player.username, shipDefinition);
      if (saved) {
        console.log(`Ship saved to localStorage for ${player.username}`);
      } else {
        console.warn(`Failed to save ship to localStorage for ${player.username}`);
      }
    } else {
      console.warn("Ship storage not available");
    }
    
    // Send to server if multiplayer is enabled
    if (multiplayerClient) {
      try {
        multiplayerClient.sendShipUpdate(shipDefinition);
        console.log("Ship update sent to server");
      } catch (error) {
        console.error("Error sending ship update to server:", error);
      }
    }
  } catch (error) {
    console.error('Error saving ship:', error);
  }
}

/**
 * Handle ship update from another player
 * @param {Object} data - Ship update data
 */
function handleShipUpdate(data) {
  // Find the player
  const player = gameState.players.find(p => p.username === data.username);
  
  if (player && player.ship) {
    // Update the ship
    player.ship.loadFromDefinition(data.shipDefinition, renderer.scene, resourceLoader.textureLoader);
    console.log(`Updated ship for ${data.username}`);
  }
}

/**
 * Handle world state from server
 * @param {Object} data - World state data
 */
function handleWorldState(data) {
  console.log('Received world state from server');
  
  // Load blocks from world state
  for (const key in data.blocks) {
    const block = data.blocks[key];
    
    // Add block to world
    worldManager.addBlock(block.position, block.type);
  }
}

/**
 * Handle block placed by another player
 * @param {Object} data - Block data
 */
function handleBlockPlaced(data) {
  // If it's a world block, add it to the world
  if (data.isWorldBlock) {
    worldManager.addBlock(data.position, data.type);
    return;
  }
  
  // Otherwise, it's a ship block
  const player = gameState.players.find(p => p.username === data.username);
  
  if (player && player.ship) {
    player.ship.addBlock(data.position, data.type);
  }
}

/**
 * Handle block removed by another player
 * @param {Object} data - Block data
 */
function handleBlockRemoved(data) {
  // If it's a world block, remove it from the world
  if (data.isWorldBlock) {
    worldManager.removeBlock(data.position);
    return;
  }
  
  // Otherwise, it's a ship block
  const player = gameState.players.find(p => p.username === data.username);
  
  if (player && player.ship) {
    player.ship.removeBlock(data.position);
  }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 