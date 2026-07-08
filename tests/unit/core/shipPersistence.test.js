/**
 * Ship Persistence Tests
 * 
 * Tests for the ship persistence functionality, including saving and loading ships.
 */

import { jest } from '@jest/globals';
import { createShipStorage } from '../../../src/core/shipStorage.js';

describe('Ship Persistence', () => {
  let shipStorage;
  let mockStorage = {};
  const username = 'testPlayer';
  const shipDefinition = {
    name: 'Test Ship',
    position: { x: 0, y: 50, z: 0 },
    blocks: [
      { type: 'control', position: { x: 0, y: 0, z: 0 } },
      { type: 'lift', position: { x: 1, y: 0, z: 0 } },
      { type: 'wood', position: { x: 0, y: 0, z: 1 } }
    ]
  };
  
  beforeEach(() => {
    mockStorage = {};
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(key => mockStorage[key] || null),
        setItem: jest.fn((key, value) => {
          mockStorage[key] = value;
        }),
        removeItem: jest.fn(key => {
          delete mockStorage[key];
        }),
        clear: jest.fn(() => {
          mockStorage = {};
        })
      },
      writable: true
    });
    
    jest.clearAllMocks();
    shipStorage = createShipStorage();
  });
  
  describe('saveShip', () => {
    test('should save a ship to localStorage', () => {
      // Act
      const result = shipStorage.saveShip(username, shipDefinition);
      
      // Assert
      expect(result).toBe(true);
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}_0`,
        expect.any(String)
      );
      
      const savedData = JSON.parse(global.localStorage.setItem.mock.calls[0][1]);
      expect(savedData).toEqual(shipDefinition);
    });
    
    test('should return false if an error occurs', () => {
      // Arrange
      global.localStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Act
      const result = shipStorage.saveShip(username, shipDefinition);
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('loadShip', () => {
    test('should load a ship from localStorage', () => {
      // Arrange
      mockStorage[`airshipHeroes_ship_${username}_0`] = JSON.stringify(shipDefinition);
      
      // Act
      const result = shipStorage.loadShip(username);
      
      // Assert
      expect(result).toEqual(shipDefinition);
      expect(global.localStorage.getItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}_0`
      );
    });
    
    test('should return null if no ship is found', () => {
      const result = shipStorage.loadShip(username);
      expect(result).toBeNull();
    });
    
    test('should return null if an error occurs', () => {
      global.localStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Act
      const result = shipStorage.loadShip(username);
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('shipExists', () => {
    test('should return true if a ship exists', () => {
      // Arrange
      mockStorage[`airshipHeroes_ship_${username}_0`] = JSON.stringify(shipDefinition);
      
      // Act
      const result = shipStorage.shipExists(username);
      
      // Assert
      expect(result).toBe(true);
      expect(global.localStorage.getItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}_0`
      );
    });
    
    test('should return false if no ship exists', () => {
      const result = shipStorage.shipExists(username);
      expect(result).toBe(false);
    });
  });
  
  describe('deleteShip', () => {
    test('should delete a ship from localStorage', () => {
      // Act
      const result = shipStorage.deleteShip(username);
      
      // Assert
      expect(result).toBe(true);
      expect(global.localStorage.removeItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}_0`
      );
    });
    
    test('should return false if an error occurs', () => {
      // Arrange
      global.localStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Act
      const result = shipStorage.deleteShip(username);
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('Integration Tests', () => {
    test('should save and load a ship', () => {
      // Arrange
      const saveResult = shipStorage.saveShip(username, shipDefinition);
      expect(saveResult).toBe(true);
      
      // Reset mocks to verify the next calls
      jest.clearAllMocks();
      
      // Act
      const loadResult = shipStorage.loadShip(username);
      
      // Assert
      expect(loadResult).toEqual(shipDefinition);
      expect(global.localStorage.getItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}_0`
      );
    });
    
    test('should save and delete a ship', () => {
      // Arrange
      const saveResult = shipStorage.saveShip(username, shipDefinition);
      expect(saveResult).toBe(true);
      
      // Reset mocks to verify the next calls
      jest.clearAllMocks();
      
      // Act
      const deleteResult = shipStorage.deleteShip(username);
      
      // Assert
      expect(deleteResult).toBe(true);
      expect(global.localStorage.removeItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}_0`
      );
      
      // Verify the ship no longer exists
      expect(shipStorage.shipExists(username)).toBe(false);
    });
  });
}); 