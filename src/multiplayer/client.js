/**
 * Multiplayer Client Module
 * 
 * Handles client-side multiplayer functionality using Socket.IO.
 */

import { io } from 'socket.io-client';

/**
 * Create a multiplayer client
 * @param {Object} options - Options for the multiplayer client
 * @returns {Object} - The multiplayer client
 */
export function createMultiplayerClient(options = {}) {
  // Get WebSocket configuration from environment variables
  const wsHost = import.meta.env.VITE_WS_HOST || 'localhost';
  const wsPort = import.meta.env.VITE_WS_PORT || '3001';
  const wsUrl = `${window.location.protocol}//${wsHost}:${wsPort}`;
  
  // Create client object
  const client = {
    // Socket.IO client
    socket: null,
    
    // Connection state
    isConnected: false,
    
    // Game state
    gameState: options.gameState || null,
    
    // Server URL
    serverUrl: options.serverUrl || window.location.origin,
    
    // WebSocket URL (override with environment variables if available)
    wsUrl: options.wsUrl || wsUrl,
    
    // Update rate (updates per second)
    updateRate: options.updateRate || 10,
    
    // Update timer
    updateTimer: 0,
    
    // Callbacks
    onConnect: options.onConnect || null,
    onDisconnect: options.onDisconnect || null,
    onPlayerJoin: options.onPlayerJoin || null,
    onPlayerLeave: options.onPlayerLeave || null,
    onPlayerUpdate: options.onPlayerUpdate || null,
    onProjectileFired: options.onProjectileFired || null,
    onBlockPlaced: options.onBlockPlaced || null,
    onBlockRemoved: options.onBlockRemoved || null,
    onWorldState: options.onWorldState || null,
    onShipUpdate: options.onShipUpdate || null,
    
    /**
     * Connect to the server
     */
    connect() {
      try {
        console.log('Connecting to server at:', this.serverUrl);
        console.log('WebSocket URL:', this.wsUrl);
        
        // Create Socket.IO client
        this.socket = io(this.serverUrl, {
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
          forceNew: true,
          // Add debug option to help troubleshoot connection issues
          debug: true
        });
        
        console.log('Socket.IO client created');
        
        // Set up event handlers
        this.socket.on('connect', this.handleConnect.bind(this));
        this.socket.on('disconnect', this.handleDisconnect.bind(this));
        this.socket.on('playerJoined', this.handlePlayerJoined.bind(this));
        this.socket.on('playerLeft', this.handlePlayerLeft.bind(this));
        this.socket.on('playerUpdate', this.handlePlayerUpdate.bind(this));
        this.socket.on('projectileFired', this.handleProjectileFired.bind(this));
        this.socket.on('blockPlaced', this.handleBlockPlaced.bind(this));
        this.socket.on('blockRemoved', this.handleBlockRemoved.bind(this));
        this.socket.on('worldState', this.handleWorldState.bind(this));
        this.socket.on('shipUpdate', this.handleShipUpdate.bind(this));
        this.socket.on('connect_error', this.handleConnectionError.bind(this));
        
        // Add additional error handlers
        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
        });
        
        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`Attempting to reconnect (${attemptNumber})...`);
        });
        
        this.socket.on('reconnect_failed', () => {
          console.error('Failed to reconnect after multiple attempts');
        });
        
        console.log('Event handlers set up');
      } catch (error) {
        console.error('Error connecting to server:', error);
        
        // Call disconnect callback
        if (this.onDisconnect) {
          this.onDisconnect(error);
        }
      }
    },
    
    /**
     * Disconnect from the server
     */
    disconnect() {
      if (this.socket) {
        this.socket.disconnect();
      }
    },
    
    /**
     * Handle connection to the server
     */
    handleConnect() {
      console.log('Connected to server');
      
      this.isConnected = true;
      
      // Send player info to server
      if (this.gameState && this.gameState.username) {
        this.socket.emit('playerJoin', {
          username: this.gameState.username
        });
      }
      
      // Call connect callback
      if (this.onConnect) {
        this.onConnect();
      }
    },
    
    /**
     * Handle disconnection from the server
     */
    handleDisconnect() {
      console.log('Disconnected from server');
      
      this.isConnected = false;
      
      // Call disconnect callback
      if (this.onDisconnect) {
        this.onDisconnect();
      }
    },
    
    /**
     * Handle player joined event
     * @param {Object} data - Player data
     */
    handlePlayerJoined(data) {
      console.log(`Player joined: ${data.username}`);
      
      // Skip if it's the local player
      if (this.gameState && data.username === this.gameState.username) {
        return;
      }
      
      // Call player join callback
      if (this.onPlayerJoin) {
        this.onPlayerJoin(data);
      }
    },
    
    /**
     * Handle player left event
     * @param {Object} data - Player data
     */
    handlePlayerLeft(data) {
      console.log(`Player left: ${data.username}`);
      
      // Call player leave callback
      if (this.onPlayerLeave) {
        this.onPlayerLeave(data);
      }
    },
    
    /**
     * Handle player update event
     * @param {Object} data - Player update data
     */
    handlePlayerUpdate(data) {
      // Skip if it's the local player
      if (this.gameState && data.username === this.gameState.username) {
        return;
      }
      
      // Call player update callback
      if (this.onPlayerUpdate) {
        this.onPlayerUpdate(data);
      }
    },
    
    /**
     * Handle projectile fired event
     * @param {Object} data - Projectile data
     */
    handleProjectileFired(data) {
      // Skip if it's the local player
      if (this.gameState && data.username === this.gameState.username) {
        return;
      }
      
      // Call projectile fired callback
      if (this.onProjectileFired) {
        this.onProjectileFired(data);
      }
    },
    
    /**
     * Handle block placed event
     * @param {Object} data - Block data
     */
    handleBlockPlaced(data) {
      // Skip if it's the local player
      if (this.gameState && data.username === this.gameState.username) {
        return;
      }
      
      // Call block placed callback
      if (this.onBlockPlaced) {
        this.onBlockPlaced(data);
      }
    },
    
    /**
     * Handle block removed event
     * @param {Object} data - Block data
     */
    handleBlockRemoved(data) {
      // Skip if it's the local player
      if (this.gameState && data.username === this.gameState.username) {
        return;
      }
      
      // Call block removed callback
      if (this.onBlockRemoved) {
        this.onBlockRemoved(data);
      }
    },
    
    /**
     * Handle world state event
     * @param {Object} data - World state data
     */
    handleWorldState(data) {
      console.log('Received world state');
      
      // Call world state callback
      if (this.onWorldState) {
        this.onWorldState(data);
      }
    },
    
    /**
     * Handle ship update event
     * @param {Object} data - Ship update data
     */
    handleShipUpdate(data) {
      console.log(`Received ship update from: ${data.username}`);
      
      // Skip if it's the local player
      if (this.gameState && data.username === this.gameState.username) {
        return;
      }
      
      // Call ship update callback
      if (this.onShipUpdate) {
        this.onShipUpdate(data);
      }
    },
    
    /**
     * Handle connection error
     * @param {Error} error - The connection error
     */
    handleConnectionError(error) {
      console.error('Connection error:', error);
      
      // Log more detailed error information
      if (error && error.message) {
        console.error('Error message:', error.message);
      }
      
      if (error && error.type) {
        console.error('Error type:', error.type);
      }
      
      // Check if it's a CORS issue
      if (error && error.message && error.message.includes('CORS')) {
        console.error('CORS error detected. Check server CORS configuration.');
      }
      
      // Check if it's a proxy error
      if (error && error.message && error.message.includes('proxy')) {
        console.error('Proxy error detected. Check Vite proxy configuration in vite.config.js.');
      }
      
      // Call disconnect callback
      if (this.onDisconnect) {
        this.onDisconnect(error);
      }
    },
    
    /**
     * Send player update to the server
     */
    sendPlayerUpdate() {
      if (!this.isConnected || !this.socket || !this.gameState || !this.gameState.localPlayer) {
        return;
      }
      
      const player = this.gameState.localPlayer;
      
      // Send player update
      this.socket.emit('playerUpdate', {
        username: player.username,
        shipPosition: player.ship.position,
        shipRotation: player.ship.rotation,
        mode: player.mode,
        characterPosition: player.character.position,
        characterRotation: player.character.rotation,
        kills: player.kills,
        deaths: player.deaths
      });
    },
    
    /**
     * Send projectile fired event to the server
     * @param {Object} projectile - The projectile that was fired
     */
    sendProjectileFired(projectile) {
      if (!this.isConnected || !this.socket || !this.gameState) {
        return;
      }
      
      // Send projectile fired event
      this.socket.emit('projectileFired', {
        username: this.gameState.username,
        position: projectile.position,
        velocity: projectile.velocity,
        fuseTimer: projectile.fuseTimer
      });
    },
    
    /**
     * Send block placed event to the server
     * @param {Object} block - The block that was placed
     */
    sendBlockPlaced(block) {
      if (!this.isConnected || !this.socket || !this.gameState) {
        return;
      }
      
      // Send block placed event
      this.socket.emit('blockPlaced', {
        username: this.gameState.username,
        type: block.type,
        position: block.position,
        options: {
          direction: block.direction
        }
      });
    },
    
    /**
     * Send block removed event to the server
     * @param {Object} block - The block that was removed
     */
    sendBlockRemoved(block) {
      if (!this.isConnected || !this.socket || !this.gameState) {
        return;
      }
      
      // Send block removed event
      this.socket.emit('blockRemoved', {
        username: this.gameState.username,
        position: block.position
      });
    },
    
    /**
     * Send ship update to the server
     * @param {Object} shipDefinition - The ship definition
     */
    sendShipUpdate(shipDefinition) {
      if (!this.isConnected || !this.socket || !this.gameState) {
        return;
      }
      
      // Send ship update
      this.socket.emit('shipUpdate', {
        username: this.gameState.username,
        shipDefinition
      });
    },
    
    /**
     * Update the multiplayer client
     * @param {Number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
      // Update timer
      this.updateTimer += deltaTime;
      
      // Send updates at the specified rate
      if (this.updateTimer >= 1 / this.updateRate) {
        this.sendPlayerUpdate();
        this.updateTimer = 0;
      }
    }
  };
  
  return client;
} 