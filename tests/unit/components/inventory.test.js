/**
 * Inventory Tests
 * 
 * Tests for the inventory functionality in the Player class.
 */

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Import Player class
import Player from '../../../src/components/player.js';

// Mock the Player class methods that interact with the DOM
jest.mock('../../../src/components/player.js', () => {
  const originalModule = jest.requireActual('../../../src/components/player.js');
  
  return {
    __esModule: true,
    default: class MockPlayer extends originalModule.default {
      constructor(options) {
        super(options);
        
        // Mock methods that interact with the DOM
        this.updateInventoryUI = jest.fn();
        this.setupEventListeners = jest.fn();
      }
    }
  };
});

describe('Player Inventory', () => {
  let player;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create player instance
    player = new Player({
      username: 'testPlayer'
    });
    
    // Initialize inventory
    player.inventory = {
      slots: Array(9).fill().map(() => null),
      selectedSlot: 0,
      maxStackSize: 64
    };
  });
  
  test('addToInventory should add an item to an empty slot', () => {
    // Arrange
    const item = { type: 'wood' };
    
    // Act
    const result = player.addToInventory(item);
    
    // Assert
    expect(result).toBe(true);
    expect(player.inventory.slots[0]).toEqual({ type: 'wood', count: 1 });
    expect(player.updateInventoryUI).toHaveBeenCalled();
  });
  
  test('addToInventory should stack items of the same type', () => {
    // Arrange
    player.inventory.slots[0] = { type: 'wood', count: 1 };
    const item = { type: 'wood' };
    
    // Act
    const result = player.addToInventory(item);
    
    // Assert
    expect(result).toBe(true);
    expect(player.inventory.slots[0]).toEqual({ type: 'wood', count: 2 });
    expect(player.updateInventoryUI).toHaveBeenCalled();
  });
  
  test('addToInventory should use a new slot if existing stacks are full', () => {
    // Arrange
    player.inventory.slots[0] = { type: 'wood', count: 64 };
    const item = { type: 'wood' };
    
    // Act
    const result = player.addToInventory(item);
    
    // Assert
    expect(result).toBe(true);
    expect(player.inventory.slots[0]).toEqual({ type: 'wood', count: 64 });
    expect(player.inventory.slots[1]).toEqual({ type: 'wood', count: 1 });
    expect(player.updateInventoryUI).toHaveBeenCalled();
  });
  
  test('addToInventory should return false if inventory is full', () => {
    // Arrange
    player.inventory.slots = Array(9).fill().map(() => ({ type: 'wood', count: 64 }));
    const item = { type: 'stone' };
    
    // Act
    const result = player.addToInventory(item);
    
    // Assert
    expect(result).toBe(false);
    expect(player.inventory.slots.every(slot => slot.type === 'wood')).toBe(true);
    expect(player.updateInventoryUI).not.toHaveBeenCalled();
  });
  
  test('removeFromInventory should remove an item from a slot', () => {
    // Arrange
    player.inventory.slots[0] = { type: 'wood', count: 2 };
    
    // Act
    const result = player.removeFromInventory(0);
    
    // Assert
    expect(result).toBe(true);
    expect(player.inventory.slots[0]).toEqual({ type: 'wood', count: 1 });
    expect(player.updateInventoryUI).toHaveBeenCalled();
  });
  
  test('removeFromInventory should remove the slot if count reaches 0', () => {
    // Arrange
    player.inventory.slots[0] = { type: 'wood', count: 1 };
    
    // Act
    const result = player.removeFromInventory(0);
    
    // Assert
    expect(result).toBe(true);
    expect(player.inventory.slots[0]).toBeNull();
    expect(player.updateInventoryUI).toHaveBeenCalled();
  });
  
  test('removeFromInventory should return false for invalid slot index', () => {
    // Act
    const result = player.removeFromInventory(10);
    
    // Assert
    expect(result).toBe(false);
    expect(player.updateInventoryUI).not.toHaveBeenCalled();
  });
  
  test('selectInventorySlot should update the selected slot', () => {
    // Arrange
    player.inventory.selectedSlot = 0;
    
    // Act
    player.selectInventorySlot(2);
    
    // Assert
    expect(player.inventory.selectedSlot).toBe(2);
    expect(player.updateInventoryUI).toHaveBeenCalled();
  });
  
  test('saveInventory should save to localStorage', () => {
    // Arrange
    player.inventory.slots[0] = { type: 'wood', count: 5 };
    
    // Act
    player.saveInventory();
    
    // Assert
    expect(localStorage.setItem).toHaveBeenCalled();
    const key = `inventory_${player.username}`;
    expect(localStorage.setItem).toHaveBeenCalledWith(key, expect.any(String));
    
    // Verify the saved data
    const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
    expect(savedData.slots[0]).toEqual({ type: 'wood', count: 5 });
  });
  
  test('loadInventory should load from localStorage', () => {
    // Arrange
    const inventoryData = {
      slots: [
        { type: 'wood', count: 5 },
        null,
        { type: 'stone', count: 10 }
      ],
      selectedSlot: 2,
      maxStackSize: 64
    };
    
    localStorage.getItem.mockReturnValueOnce(JSON.stringify(inventoryData));
    
    // Act
    const result = player.loadInventory();
    
    // Assert
    expect(result).toBe(true);
    expect(player.inventory.slots[0]).toEqual({ type: 'wood', count: 5 });
    expect(player.inventory.slots[1]).toBeNull();
    expect(player.inventory.slots[2]).toEqual({ type: 'stone', count: 10 });
    expect(player.inventory.selectedSlot).toBe(2);
    expect(player.updateInventoryUI).toHaveBeenCalled();
  });
  
  test('loadInventory should return false if no data is found', () => {
    // Arrange
    localStorage.getItem.mockReturnValueOnce(null);
    
    // Act
    const result = player.loadInventory();
    
    // Assert
    expect(result).toBe(false);
    expect(player.updateInventoryUI).not.toHaveBeenCalled();
  });
}); 