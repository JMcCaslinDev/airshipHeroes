/**
 * Server Tests
 */

const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const express = require('express');

describe('Server', () => {
  let io, serverSocket, clientSocket, app, server;
  
  beforeAll((done) => {
    // Create a test server
    app = express();
    server = http.createServer(app);
    io = new Server(server);
    
    // Start server on a test port
    server.listen(3002, () => {
      // Create a client socket
      clientSocket = new Client('http://localhost:3002', {
        transports: ['websocket']
      });
      
      // Set up server socket
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });
  
  afterAll(() => {
    // Clean up
    io.close();
    clientSocket.close();
    server.close();
  });
  
  test('should work', (done) => {
    // Test basic socket.io functionality
    serverSocket.on('hello', (data) => {
      expect(data).toBe('world');
      done();
    });
    
    clientSocket.emit('hello', 'world');
  });
  
  test('should handle player join', (done) => {
    // Test player join event
    const username = 'testPlayer';
    
    serverSocket.on('playerJoin', (data) => {
      expect(data.username).toBe(username);
      
      // Emit playerJoined event back to client
      serverSocket.emit('playerJoined', { username });
    });
    
    clientSocket.on('playerJoined', (data) => {
      expect(data.username).toBe(username);
      done();
    });
    
    clientSocket.emit('playerJoin', { username });
  });
  
  test('should handle player update', (done) => {
    // Test player update event
    const playerData = {
      username: 'testPlayer',
      shipPosition: { x: 10, y: 20, z: 30 },
      shipRotation: 45
    };
    
    serverSocket.on('playerUpdate', (data) => {
      expect(data.username).toBe(playerData.username);
      expect(data.shipPosition).toEqual(playerData.shipPosition);
      expect(data.shipRotation).toBe(playerData.shipRotation);
      
      // Emit playerUpdate event back to client
      serverSocket.emit('playerUpdate', data);
    });
    
    clientSocket.on('playerUpdate', (data) => {
      expect(data.username).toBe(playerData.username);
      expect(data.shipPosition).toEqual(playerData.shipPosition);
      expect(data.shipRotation).toBe(playerData.shipRotation);
      done();
    });
    
    clientSocket.emit('playerUpdate', playerData);
  });
  
  test('should handle block placed', (done) => {
    // Test block placed event
    const blockData = {
      username: 'testPlayer',
      position: { x: 1, y: 2, z: 3 },
      type: 'wood',
      isWorldBlock: true
    };
    
    serverSocket.on('blockPlaced', (data) => {
      expect(data.username).toBe(blockData.username);
      expect(data.position).toEqual(blockData.position);
      expect(data.type).toBe(blockData.type);
      expect(data.isWorldBlock).toBe(blockData.isWorldBlock);
      
      // Emit blockPlaced event back to client
      serverSocket.emit('blockPlaced', data);
    });
    
    clientSocket.on('blockPlaced', (data) => {
      expect(data.username).toBe(blockData.username);
      expect(data.position).toEqual(blockData.position);
      expect(data.type).toBe(blockData.type);
      expect(data.isWorldBlock).toBe(blockData.isWorldBlock);
      done();
    });
    
    clientSocket.emit('blockPlaced', blockData);
  });
}); 