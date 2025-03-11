/**
 * Airship Skirmish - Main Entry Point
 * 
 * This file initializes the game, sets up Three.js, and manages the game loop.
 */

import * as THREE from 'three';
import { io } from 'socket.io-client';
import Player from './components/player.js';
import Ship from './components/ship.js';

// Game state
let gameState = {
  isLoggedIn: false,
  players: {},
  projectiles: [],
  lastTime: 0,
  textureLoader: null,
  worldHeight: 500
};

// Three.js setup
let scene, camera, renderer;

/**
 * Initialize the game
 */
function init() {
  // Create login screen
  createLoginScreen();
  
  // Set up Three.js scene (will be activated after login)
  setupThreeJS();
  
  // Add event listeners
  window.addEventListener('resize', onWindowResize);
}

/**
 * Create the login screen where players enter their username
 */
function createLoginScreen() {
  const loginContainer = document.createElement('div');
  loginContainer.id = 'login-container';
  loginContainer.style.position = 'absolute';
  loginContainer.style.top = '50%';
  loginContainer.style.left = '50%';
  loginContainer.style.transform = 'translate(-50%, -50%)';
  loginContainer.style.textAlign = 'center';
  loginContainer.style.padding = '20px';
  loginContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  loginContainer.style.borderRadius = '10px';
  loginContainer.style.color = 'white';
  
  const title = document.createElement('h1');
  title.textContent = 'Airship Skirmish';
  
  const usernameInput = document.createElement('input');
  usernameInput.type = 'text';
  usernameInput.placeholder = 'Enter username';
  usernameInput.style.margin = '20px 0';
  usernameInput.style.padding = '10px';
  usernameInput.style.width = '100%';
  
  const startButton = document.createElement('button');
  startButton.textContent = 'Start Game';
  startButton.style.padding = '10px 20px';
  startButton.style.backgroundColor = '#4CAF50';
  startButton.style.border = 'none';
  startButton.style.borderRadius = '5px';
  startButton.style.cursor = 'pointer';
  
  startButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
      gameState.isLoggedIn = true;
      document.body.removeChild(loginContainer);
      startGame(username);
    } else {
      alert('Please enter a username');
    }
  });
  
  loginContainer.appendChild(title);
  loginContainer.appendChild(usernameInput);
  loginContainer.appendChild(startButton);
  document.body.appendChild(loginContainer);
}

/**
 * Set up Three.js scene, camera, and renderer
 */
function setupThreeJS() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue
  
  // Create camera
  camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
  );
  camera.position.set(0, 5, 10);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  
  // Add renderer to DOM
  document.body.appendChild(renderer.domElement);
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  // Add directional light (sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  // Create texture loader
  gameState.textureLoader = new THREE.TextureLoader();
  
  // Create ground plane
  createGround();
}

/**
 * Create a simple ground plane
 */
function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x228B22, // Forest green
    roughness: 0.8,
    metalness: 0.2
  });
  
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = 0;
  ground.receiveShadow = true;
  
  scene.add(ground);
}

/**
 * Start the game after login
 * @param {String} username - The player's username
 */
function startGame(username) {
  // Create local player
  const localPlayer = new Player({
    username: username,
    camera: camera
  });
  
  // Initialize player
  localPlayer.init(scene, camera);
  
  // Store player in game state
  gameState.players[username] = localPlayer;
  gameState.localPlayer = localPlayer;
  
  // Load default ship for the player
  loadDefaultShip(localPlayer);
  
  // Connect to WebSocket server
  connectToServer(localPlayer);
  
  // Start animation loop
  gameState.lastTime = performance.now();
  animate();
  
  // Show UI elements
  document.getElementById('ui-container').style.display = 'none'; // Initially hidden in Ship Mode
  document.getElementById('mode-indicator').style.display = 'block';
  document.getElementById('stats').style.display = 'block';
}

/**
 * Load the default ship for the player
 * @param {Player} player - The player to load the ship for
 */
function loadDefaultShip(player) {
  // Fetch the default ship definition
  fetch('/ships/defaultShip.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load default ship');
      }
      return response.json();
    })
    .then(shipDefinition => {
      // Load the ship
      player.ship.loadFromDefinition(shipDefinition, scene, gameState.textureLoader);
      console.log('Default ship loaded');
    })
    .catch(error => {
      console.error('Error loading default ship:', error);
      
      // Create a simple fallback ship if loading fails
      createFallbackShip(player);
    });
}

/**
 * Create a simple fallback ship if loading the default ship fails
 * @param {Player} player - The player to create the ship for
 */
function createFallbackShip(player) {
  console.log('Creating fallback ship');
  
  // Create a simple ship definition
  const fallbackShip = {
    name: "Fallback Ship",
    description: "A simple fallback ship",
    blocks: [
      {"type": "steeringWheel", "x": 0, "y": 0, "z": 0},
      {"type": "lift", "x": -1, "y": 0, "z": 0},
      {"type": "lift", "x": 1, "y": 0, "z": 0},
      {"type": "lift", "x": 0, "y": 0, "z": -1},
      {"type": "lift", "x": 0, "y": 0, "z": 1},
      {"type": "armor", "x": -2, "y": 0, "z": 0},
      {"type": "armor", "x": 2, "y": 0, "z": 0},
      {"type": "engine", "x": 0, "y": 0, "z": -2, "direction": {"x": 0, "y": 0, "z": -1}}
    ]
  };
  
  // Load the fallback ship
  player.ship.loadFromDefinition(fallbackShip, scene, gameState.textureLoader);
}

/**
 * Connect to WebSocket server for multiplayer functionality
 * @param {Player} player - The local player
 */
function connectToServer(player) {
  const socket = io();
  
  socket.on('connect', () => {
    console.log('Connected to server');
    
    // Send player info to server
    socket.emit('playerJoin', {
      username: player.username
    });
  });
  
  socket.on('playerJoined', (data) => {
    console.log(`Player joined: ${data.username}`);
    
    // Create new player if it's not the local player
    if (data.username !== player.username && !gameState.players[data.username]) {
      const newPlayer = new Player({
        username: data.username
      });
      
      // Initialize player (without camera)
      newPlayer.init(scene, null);
      
      // Store player in game state
      gameState.players[data.username] = newPlayer;
    }
  });
  
  socket.on('playerLeft', (data) => {
    console.log(`Player left: ${data.username}`);
    
    // Remove player from game state
    if (gameState.players[data.username]) {
      // Remove player's ship from scene
      if (gameState.players[data.username].ship && gameState.players[data.username].ship.group) {
        scene.remove(gameState.players[data.username].ship.group);
      }
      
      // Remove player's character from scene
      if (gameState.players[data.username].character && gameState.players[data.username].character.mesh) {
        scene.remove(gameState.players[data.username].character.mesh);
      }
      
      // Delete player from game state
      delete gameState.players[data.username];
    }
  });
  
  socket.on('playerUpdate', (data) => {
    // Update remote player
    if (data.username !== player.username && gameState.players[data.username]) {
      const remotePlayer = gameState.players[data.username];
      
      // Update ship position and rotation
      if (remotePlayer.ship) {
        remotePlayer.ship.position = data.shipPosition;
        remotePlayer.ship.rotation = data.shipRotation;
        
        // Update ship group
        if (remotePlayer.ship.group) {
          remotePlayer.ship.group.position.set(
            data.shipPosition.x,
            data.shipPosition.y,
            data.shipPosition.z
          );
          remotePlayer.ship.group.rotation.y = data.shipRotation;
        }
      }
      
      // Update player mode
      remotePlayer.mode = data.mode;
      
      // Update character position if in Player Mode
      if (data.mode === 'player' && remotePlayer.character) {
        remotePlayer.character.position = data.characterPosition;
        remotePlayer.character.rotation = data.characterRotation;
        
        // Update character mesh
        if (remotePlayer.character.mesh) {
          remotePlayer.character.mesh.position.set(
            data.characterPosition.x,
            data.characterPosition.y,
            data.characterPosition.z
          );
          remotePlayer.character.mesh.rotation.y = data.characterRotation;
          remotePlayer.character.mesh.visible = true;
        }
      } else if (remotePlayer.character && remotePlayer.character.mesh) {
        // Hide character mesh in Ship Mode
        remotePlayer.character.mesh.visible = false;
      }
      
      // Update stats
      remotePlayer.kills = data.kills;
      remotePlayer.deaths = data.deaths;
    }
  });
  
  socket.on('projectileFired', (data) => {
    // Create projectile
    // (In a full implementation, this would create a TNT projectile)
    console.log(`Player ${data.username} fired a projectile`);
  });
  
  socket.on('blockPlaced', (data) => {
    // Add block to ship
    // (In a full implementation, this would add a block to the ship)
    console.log(`Player ${data.username} placed a block`);
  });
  
  socket.on('blockRemoved', (data) => {
    // Remove block from ship
    // (In a full implementation, this would remove a block from the ship)
    console.log(`Player ${data.username} removed a block`);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
  
  // Store socket in game state
  gameState.socket = socket;
}

/**
 * Send local player updates to the server
 */
function sendPlayerUpdates() {
  if (!gameState.socket || !gameState.localPlayer) return;
  
  const player = gameState.localPlayer;
  
  // Send player update
  gameState.socket.emit('playerUpdate', {
    username: player.username,
    shipPosition: player.ship.position,
    shipRotation: player.ship.rotation,
    mode: player.mode,
    characterPosition: player.character.position,
    characterRotation: player.character.rotation,
    kills: player.kills,
    deaths: player.deaths
  });
}

/**
 * Update projectiles
 * @param {Number} deltaTime - Time since last frame in seconds
 */
function updateProjectiles(deltaTime) {
  // Update each projectile
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const projectile = gameState.projectiles[i];
    
    // Update position based on velocity
    projectile.position.x += projectile.userData.velocity.x * deltaTime;
    projectile.position.y += projectile.userData.velocity.y * deltaTime;
    projectile.position.z += projectile.userData.velocity.z;
    
    // Apply gravity
    projectile.userData.velocity.y -= 9.8 * deltaTime;
    
    // Update fuse timer
    projectile.userData.fuseTimer -= deltaTime;
    
    // Check if fuse timer expired
    if (projectile.userData.fuseTimer <= 0) {
      // Explode
      createExplosion(projectile.position);
      
      // Remove projectile
      scene.remove(projectile);
      gameState.projectiles.splice(i, 1);
    }
  }
}

/**
 * Create an explosion effect
 * @param {Object} position - The position of the explosion
 */
function createExplosion(position) {
  // Create a simple explosion effect
  const explosionGeometry = new THREE.SphereGeometry(2, 16, 16);
  const explosionMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.8
  });
  
  const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
  explosion.position.set(position.x, position.y, position.z);
  scene.add(explosion);
  
  // Animate explosion
  let scale = 1;
  const expandInterval = setInterval(() => {
    scale += 0.2;
    explosion.scale.set(scale, scale, scale);
    explosionMaterial.opacity -= 0.05;
    
    if (explosionMaterial.opacity <= 0) {
      clearInterval(expandInterval);
      scene.remove(explosion);
    }
  }, 50);
  
  // Check for damage to ships
  // (In a full implementation, this would check for nearby ships and damage them)
}

/**
 * Handle window resize
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Animation loop
 * @param {Number} time - Current time in milliseconds
 */
function animate(time) {
  requestAnimationFrame(animate);
  
  // Calculate delta time
  const deltaTime = (time - gameState.lastTime) / 1000; // Convert to seconds
  gameState.lastTime = time;
  
  // Cap delta time to prevent large jumps
  const cappedDeltaTime = Math.min(deltaTime, 0.1);
  
  // Update local player
  if (gameState.localPlayer) {
    gameState.localPlayer.update(cappedDeltaTime, scene);
  }
  
  // Update projectiles
  updateProjectiles(cappedDeltaTime);
  
  // Send updates to server (throttled to 10 times per second)
  if (time % 100 < 16) { // Approximately every 100ms
    sendPlayerUpdates();
  }
  
  // Render scene
  renderer.render(scene, camera);
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 