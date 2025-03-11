/**
 * Airship Skirmish - Server
 * 
 * This file sets up a simple Express server with Socket.IO for multiplayer functionality.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Store connected players
const players = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle player join
  socket.on('playerJoin', (data) => {
    const { username } = data;
    
    console.log(`Player joined: ${username}`);
    
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
      deaths: 0
    };
    
    // Broadcast to all clients that a new player joined
    io.emit('playerJoined', { username });
    
    // Send existing players to the new player
    for (const id in players) {
      if (id !== socket.id) {
        socket.emit('playerJoined', { username: players[id].username });
      }
    }
  });
  
  // Handle player update
  socket.on('playerUpdate', (data) => {
    // Update player data
    if (players[socket.id]) {
      players[socket.id] = {
        ...players[socket.id],
        ...data
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
    // Broadcast to all other clients
    socket.broadcast.emit('blockPlaced', {
      username: players[socket.id]?.username,
      ...data
    });
  });
  
  // Handle block removed
  socket.on('blockRemoved', (data) => {
    // Broadcast to all other clients
    socket.broadcast.emit('blockRemoved', {
      username: players[socket.id]?.username,
      ...data
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Get username before removing player
    const username = players[socket.id]?.username;
    
    // Remove player from players object
    delete players[socket.id];
    
    // Broadcast to all clients that a player left
    if (username) {
      io.emit('playerLeft', { username });
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 