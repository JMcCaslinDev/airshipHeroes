/**
 * Airship Skirmish - Server
 * 
 * This file sets up a scalable Express server with Socket.IO for multiplayer functionality.
 * Optimized to handle 100+ concurrent users.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get configuration from environment variables
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.VITE_WS_PORT || PORT; // Use WebSocket port if specified
const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS || 100);
const WORLD_SIZE = parseInt(process.env.WORLD_SIZE || 1000);
const WORLD_HEIGHT = parseInt(process.env.WORLD_HEIGHT || 500);
const SAVE_INTERVAL = parseInt(process.env.SAVE_INTERVAL || 60000);
const WEBSOCKET_PING_INTERVAL = parseInt(process.env.WEBSOCKET_PING_INTERVAL || 10000);
const WEBSOCKET_PING_TIMEOUT = parseInt(process.env.WEBSOCKET_PING_TIMEOUT || 5000);

console.log(`Starting server on port ${PORT}`);
console.log(`WebSocket configured for port ${WS_PORT}`);

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with performance optimizations
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: WEBSOCKET_PING_INTERVAL,
  pingTimeout: WEBSOCKET_PING_TIMEOUT,
  transports: ['websocket'],
  maxHttpBufferSize: 1e6, // 1MB max message size
  connectTimeout: 10000 // 10 seconds connection timeout
});

// Use compression middleware to reduce bandwidth
app.use(compression());

// Use helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for simplicity in development
}));

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d' // Cache static assets for 1 day
}));

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Store connected players
const players = {};

// Track player count
let playerCount = 0;

// Track world state
const worldState = {
  blocks: {}, // Blocks that have been placed/removed in the world (not on ships)
  lastUpdate: Date.now()
};

// Create world state directory if it doesn't exist
const worldStateDir = path.join(__dirname, 'data');
if (!fs.existsSync(worldStateDir)) {
  fs.mkdirSync(worldStateDir, { recursive: true });
}

// Load world state from file if it exists
const worldStatePath = path.join(worldStateDir, 'world.json');
try {
  if (fs.existsSync(worldStatePath)) {
    const worldData = fs.readFileSync(worldStatePath, 'utf8');
    const parsedData = JSON.parse(worldData);
    worldState.blocks = parsedData.blocks || {};
    console.log('Loaded world state from file');
  }
} catch (error) {
  console.error('Error loading world state:', error);
}

// Save world state to file periodically
setInterval(() => {
  try {
    fs.writeFileSync(
      worldStatePath,
      JSON.stringify({ blocks: worldState.blocks, lastUpdate: Date.now() }),
      'utf8'
    );
    console.log('Saved world state to file');
  } catch (error) {
    console.error('Error saving world state:', error);
  }
}, SAVE_INTERVAL);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Check if server is full
  if (playerCount >= MAX_PLAYERS) {
    socket.emit('serverFull');
    socket.disconnect(true);
    return;
  }
  
  // Handle player join
  socket.on('playerJoin', (data) => {
    const { username } = data;
    
    console.log(`Player joined: ${username}`);
    
    // Increment player count
    playerCount++;
    
    // Store player data
    players[socket.id] = {
      username,
      socketId: socket.id,
      shipPosition: { x: 0, y: 100, z: 0 },
      shipRotation: 0,
      mode: 'ship',
      characterPosition: { x: 0, y: 100, z: 0 },
      characterRotation: 0,
      kills: 0,
      deaths: 0,
      lastUpdate: Date.now()
    };
    
    // Broadcast to all clients that a new player joined
    io.emit('playerJoined', { username });
    
    // Send existing players to the new player
    for (const id in players) {
      if (id !== socket.id) {
        socket.emit('playerJoined', { username: players[id].username });
        
        // Send the latest state of each player
        socket.emit('playerUpdate', {
          username: players[id].username,
          shipPosition: players[id].shipPosition,
          shipRotation: players[id].shipRotation,
          mode: players[id].mode,
          characterPosition: players[id].characterPosition,
          characterRotation: players[id].characterRotation,
          kills: players[id].kills,
          deaths: players[id].deaths
        });
      }
    }
    
    // Send world state to the new player
    socket.emit('worldState', worldState);
    
    // Send server stats to all clients
    io.emit('serverStats', {
      playerCount,
      maxPlayers: MAX_PLAYERS
    });
  });
  
  // Handle player update
  socket.on('playerUpdate', (data) => {
    // Update player data
    if (players[socket.id]) {
      players[socket.id] = {
        ...players[socket.id],
        ...data,
        lastUpdate: Date.now()
      };
      
      // Broadcast player update to all other clients
      socket.broadcast.emit('playerUpdate', data);
    }
  });
  
  // Handle projectile fired
  socket.on('projectileFired', (data) => {
    // Broadcast to all other clients
    socket.broadcast.emit('projectileFired', {
      username: players[socket.id]?.username,
      ...data
    });
  });
  
  // Handle block placed
  socket.on('blockPlaced', (data) => {
    // Update world state if it's a world block (not on a ship)
    if (data.isWorldBlock) {
      const blockKey = `${data.position.x},${data.position.y},${data.position.z}`;
      
      // Check if position is within world bounds
      if (
        Math.abs(data.position.x) <= WORLD_SIZE / 2 &&
        Math.abs(data.position.z) <= WORLD_SIZE / 2 &&
        data.position.y >= 0 &&
        data.position.y <= WORLD_HEIGHT
      ) {
        worldState.blocks[blockKey] = {
          type: data.type,
          position: data.position
        };
        worldState.lastUpdate = Date.now();
      }
    }
    
    // Broadcast to all other clients
    socket.broadcast.emit('blockPlaced', {
      username: players[socket.id]?.username,
      ...data
    });
  });
  
  // Handle block removed
  socket.on('blockRemoved', (data) => {
    // Update world state if it's a world block (not on a ship)
    if (data.isWorldBlock) {
      const blockKey = `${data.position.x},${data.position.y},${data.position.z}`;
      delete worldState.blocks[blockKey];
      worldState.lastUpdate = Date.now();
    }
    
    // Broadcast to all other clients
    socket.broadcast.emit('blockRemoved', {
      username: players[socket.id]?.username,
      ...data
    });
  });
  
  // Handle ship update (when a player's ship design changes)
  socket.on('shipUpdate', (data) => {
    // Broadcast to all other clients
    socket.broadcast.emit('shipUpdate', {
      username: players[socket.id]?.username,
      shipDefinition: data.shipDefinition
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Get username before removing player
    const username = players[socket.id]?.username;
    
    // Remove player from players object
    delete players[socket.id];
    
    // Decrement player count if this was a player
    if (username) {
      playerCount--;
      
      // Broadcast to all clients that a player left
      io.emit('playerLeft', { username });
      
      // Send updated server stats to all clients
      io.emit('serverStats', {
        playerCount,
        maxPlayers: MAX_PLAYERS
      });
    }
  });
});

// Clean up inactive players every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const id in players) {
    // If player hasn't updated in 5 minutes, consider them inactive
    if (now - players[id].lastUpdate > 5 * 60 * 1000) {
      console.log(`Removing inactive player: ${players[id].username}`);
      
      // Broadcast to all clients that a player left
      io.emit('playerLeft', { username: players[id].username });
      
      // Decrement player count
      playerCount--;
      
      // Remove player from players object
      delete players[id];
      
      // Send updated server stats to all clients
      io.emit('serverStats', {
        playerCount,
        maxPlayers: MAX_PLAYERS
      });
    }
  }
}, 5 * 60 * 1000);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}`);
  console.log(`Maximum players: ${MAX_PLAYERS}`);
  console.log(`World size: ${WORLD_SIZE}x${WORLD_SIZE}`);
  console.log(`World height: ${WORLD_HEIGHT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('Shutting down server...');
  
  // Save world state before shutting down
  try {
    fs.writeFileSync(
      worldStatePath,
      JSON.stringify({ blocks: worldState.blocks, lastUpdate: Date.now() }),
      'utf8'
    );
    console.log('Saved world state to file');
  } catch (error) {
    console.error('Error saving world state:', error);
  }
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forcing server shutdown');
    process.exit(1);
  }, 10000);
} 