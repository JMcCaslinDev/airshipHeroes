/**
 * Ship Storage Tests
 * 
 * Tests for the ship storage functionality.
 */

// Import necessary modules
import { jest } from '@jest/globals';
import { createShipStorage } from '../../../src/core/shipStorage';

describe('ShipStorage', () => {
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
  
  // Create a proper localStorage mock
  let mockStorage = {};
  
  beforeEach(() => {
    // Clear the mock storage
    mockStorage = {};
    
    // Create localStorage mock
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
    
    // Create a new ship storage for each test
    shipStorage = createShipStorage();
  });
  
  afterEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
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
      
      // Verify the saved data
      const savedDataString = global.localStorage.setItem.mock.calls[0][1];
      const savedData = JSON.parse(savedDataString);
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
      const key = `airshipHeroes_ship_${username}_0`;
      mockStorage[key] = JSON.stringify(shipDefinition);
      
      // Act
      const result = shipStorage.loadShip(username);
      
      // Assert
      expect(result).toEqual(shipDefinition);
      expect(global.localStorage.getItem).toHaveBeenCalledWith(key);
    });
    
    test('should return null if no ship is found', () => {
      // Act
      const result = shipStorage.loadShip(username);
      
      // Assert
      expect(result).toBeNull();
      expect(global.localStorage.getItem).toHaveBeenCalledWith(`airshipHeroes_ship_${username}_0`);
    });
    
    test('should return null if an error occurs', () => {
      // Arrange
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
      const key = `airshipHeroes_ship_${username}_0`;
      mockStorage[key] = JSON.stringify(shipDefinition);
      
      // Act
      const result = shipStorage.shipExists(username);
      
      // Assert
      expect(result).toBe(true);
      expect(global.localStorage.getItem).toHaveBeenCalledWith(key);
    });
    
    test('should return false if no ship exists', () => {
      // Act
      const result = shipStorage.shipExists(username);
      
      // Assert
      expect(result).toBe(false);
      expect(global.localStorage.getItem).toHaveBeenCalledWith(`airshipHeroes_ship_${username}_0`);
    });
  });
  
  describe('deleteShip', () => {
    test('should delete a ship from localStorage', () => {
      // Arrange
      const key = `airshipHeroes_ship_${username}_0`;
      mockStorage[key] = JSON.stringify(shipDefinition);
      
      // Act
      const result = shipStorage.deleteShip(username);
      
      // Assert
      expect(result).toBe(true);
      expect(global.localStorage.removeItem).toHaveBeenCalledWith(key);
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
      // Arrange & Act
      const saveResult = shipStorage.saveShip(username, shipDefinition);
      
      // Assert save result
      expect(saveResult).toBe(true);
      
      // Act - load the ship
      const loadResult = shipStorage.loadShip(username);
      
      // Assert load result
      expect(loadResult).toEqual(shipDefinition);
    });
    
    test('should save and delete a ship', () => {
      // Arrange & Act
      const saveResult = shipStorage.saveShip(username, shipDefinition);
      
      // Assert save result
      expect(saveResult).toBe(true);
      
      // Act - delete the ship
      const deleteResult = shipStorage.deleteShip(username);
      
      // Assert delete result
      expect(deleteResult).toBe(true);
      
      // Verify the ship no longer exists
      expect(shipStorage.shipExists(username)).toBe(false);
    });
  });

  describe('multi-slot storage', () => {
    test('should store up to five independent slots', () => {
      const slotTwo = { ...shipDefinition, name: 'Slot Two' };
      shipStorage.saveShip(username, shipDefinition, 0);
      shipStorage.saveShip(username, slotTwo, 2);

      expect(shipStorage.loadShip(username, 0)).toEqual(shipDefinition);
      expect(shipStorage.loadShip(username, 2)).toEqual(slotTwo);
      expect(shipStorage.loadShip(username, 1)).toBeNull();
    });

    test('should migrate legacy single-ship saves into slot 0', () => {
      mockStorage[`airshipHeroes_ship_${username}`] = JSON.stringify(shipDefinition);

      expect(shipStorage.loadShip(username, 0)).toEqual(shipDefinition);
      expect(mockStorage[`airshipHeroes_ship_${username}`]).toBeUndefined();
    });

    test('listSlots should summarize all five slots', () => {
      shipStorage.saveShip(username, shipDefinition, 0);
      const slots = shipStorage.listSlots(username);

      expect(slots).toHaveLength(5);
      expect(slots[0].empty).toBe(false);
      expect(slots[0].blockCount).toBe(3);
      expect(slots[1].empty).toBe(true);
    });

    test('findFirstEmptySlot should skip filled slots', () => {
      shipStorage.saveShip(username, shipDefinition, 0);
      shipStorage.saveShip(username, { ...shipDefinition, name: 'Two' }, 2);

      expect(shipStorage.findFirstEmptySlot(username)).toBe(1);
    });
  });
}); 