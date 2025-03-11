/**
 * Ship Persistence Tests
 * 
 * Tests for the ship persistence functionality, including saving and loading ships.
 */

import { createShipStorage } from '../../../src/core/shipStorage.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Save original localStorage
const originalLocalStorage = global.localStorage;

describe('Ship Persistence', () => {
  let shipStorage;
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
    // Set up mock
    global.localStorage = localStorageMock;
    
    // Reset mock functions
    jest.clearAllMocks();
    
    // Create a new ship storage for each test
    shipStorage = createShipStorage();
  });
  
  afterEach(() => {
    // Restore original localStorage
    global.localStorage = originalLocalStorage;
  });
  
  describe('saveShip', () => {
    test('should save a ship to localStorage', () => {
      // Act
      const result = shipStorage.saveShip(username, shipDefinition);
      
      // Assert
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}`,
        expect.any(String)
      );
      
      // Verify the saved data
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toEqual(shipDefinition);
    });
    
    test('should return false if an error occurs', () => {
      // Arrange
      localStorageMock.setItem.mockImplementationOnce(() => {
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
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(shipDefinition));
      
      // Act
      const result = shipStorage.loadShip(username);
      
      // Assert
      expect(result).toEqual(shipDefinition);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}`
      );
    });
    
    test('should return null if no ship is found', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValueOnce(null);
      
      // Act
      const result = shipStorage.loadShip(username);
      
      // Assert
      expect(result).toBeNull();
    });
    
    test('should return null if an error occurs', () => {
      // Arrange
      localStorageMock.getItem.mockImplementationOnce(() => {
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
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(shipDefinition));
      
      // Act
      const result = shipStorage.shipExists(username);
      
      // Assert
      expect(result).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}`
      );
    });
    
    test('should return false if no ship exists', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValueOnce(null);
      
      // Act
      const result = shipStorage.shipExists(username);
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('deleteShip', () => {
    test('should delete a ship from localStorage', () => {
      // Act
      const result = shipStorage.deleteShip(username);
      
      // Assert
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}`
      );
    });
    
    test('should return false if an error occurs', () => {
      // Arrange
      localStorageMock.removeItem.mockImplementationOnce(() => {
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
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}`
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
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `airshipHeroes_ship_${username}`
      );
      
      // Verify the ship no longer exists
      expect(shipStorage.shipExists(username)).toBe(false);
    });
  });
}); 