/**
 * Inventory Selection Tests
 * 
 * Tests for inventory slot selection functionality.
 */

import { jest } from '@jest/globals';

// Mock the Player class
jest.mock('../../../src/components/player.js', () => {
  const originalModule = jest.requireActual('../../../src/components/player.js');
  
  return {
    __esModule: true,
    default: class MockPlayer extends originalModule.default {
      constructor(options) {
        super(options);
        
        // Mock methods that are not being tested
        this.toggleMode = jest.fn();
        this.saveInventory = jest.fn();
      }
    }
  };
});

// Import the Player class after mocking
import Player from '../../../src/components/player.js';

describe('Inventory Selection', () => {
  let player;
  let mockInventoryContainer;
  
  beforeEach(() => {
    // Create a new player instance
    player = new Player();
    
    // Initialize inventory with some items
    player.inventory = {
      slots: [
        { type: 'wood', count: 5 },
        { type: 'stone', count: 3 },
        { type: 'lift', count: 2 },
        null,
        { type: 'cannon', count: 1 }
      ],
      selectedSlot: 0
    };
    
    // Mock document.getElementById
    mockInventoryContainer = document.createElement('div');
    mockInventoryContainer.id = 'inventory';
    document.body.appendChild(mockInventoryContainer);
    
    // Mock document.getElementById to return our mock container
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'inventory') {
        return mockInventoryContainer;
      }
      return null;
    });
    
    // Mock window.resourceLoader
    window.resourceLoader = {
      getUrl: jest.fn().mockImplementation((type) => {
        return `/assets/textures/blocks/${type}.svg`;
      })
    };
    
    // Spy on console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Create inventory slots for testing
    player.updateInventoryUI();
  });
  
  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.clearAllMocks();
    delete window.resourceLoader;
  });
  
  test('selectInventorySlot should update the selected slot', () => {
    // Call the method
    player.selectInventorySlot(2);
    
    // Check that the selected slot was updated
    expect(player.inventory.selectedSlot).toBe(2);
    expect(player.selectedBlock).toEqual({ type: 'lift', count: 2 });
  });
  
  test('selectInventorySlot should handle empty slots', () => {
    // Call the method with an empty slot
    player.selectInventorySlot(3);
    
    // Check that the selected slot was updated
    expect(player.inventory.selectedSlot).toBe(3);
    expect(player.selectedBlock).toBeNull();
  });
  
  test('selectInventorySlot should reject invalid slot indices', () => {
    // Save the original selected slot
    const originalSlot = player.inventory.selectedSlot;
    
    // Call the method with an invalid slot index
    player.selectInventorySlot(-1);
    
    // Check that the selected slot was not updated
    expect(player.inventory.selectedSlot).toBe(originalSlot);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid slot index'));
    
    // Call the method with another invalid slot index
    player.selectInventorySlot(10);
    
    // Check that the selected slot was not updated
    expect(player.inventory.selectedSlot).toBe(originalSlot);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid slot index'));
  });
  
  test('handleKeyDown should select inventory slots with number keys', () => {
    // Create mock key events
    const keyEvents = [
      { key: '1', keyCode: 49 },
      { key: '2', keyCode: 50 },
      { key: '3', keyCode: 51 },
      { key: '4', keyCode: 52 },
      { key: '5', keyCode: 53 }
    ];
    
    // Set player mode to 'player'
    player.mode = 'player';
    
    // Mock the selectInventorySlot method
    const selectSpy = jest.spyOn(player, 'selectInventorySlot');
    
    // Test each key event
    keyEvents.forEach((event, index) => {
      // Reset the spy
      selectSpy.mockClear();
      
      // Call the method
      player.handleKeyDown(event);
      
      // Check that the correct slot was selected
      expect(selectSpy).toHaveBeenCalledWith(index);
    });
  });
  
  test('handleKeyDown should not select inventory slots in ship mode', () => {
    // Create a mock key event
    const keyEvent = { key: '1', keyCode: 49 };
    
    // Set player mode to 'ship'
    player.mode = 'ship';
    
    // Mock the selectInventorySlot method
    const selectSpy = jest.spyOn(player, 'selectInventorySlot');
    
    // Call the method
    player.handleKeyDown(keyEvent);
    
    // Check that selectInventorySlot was not called
    expect(selectSpy).not.toHaveBeenCalled();
  });
  
  test('updateInventoryUI should apply the selected class to the correct slot', () => {
    // Set the selected slot
    player.inventory.selectedSlot = 2;
    
    // Call the method
    player.updateInventoryUI();
    
    // Get all inventory slots
    const slots = document.querySelectorAll('.inventory-slot');
    
    // Check that the correct number of slots were created
    expect(slots.length).toBe(player.inventory.slots.length);
    
    // Check that only the selected slot has the 'selected' class
    slots.forEach((slot, index) => {
      if (index === 2) {
        expect(slot.classList.contains('selected')).toBe(true);
      } else {
        expect(slot.classList.contains('selected')).toBe(false);
      }
    });
  });
  
  test('selectInventorySlot should call updateInventoryUI', () => {
    // Set up initial state
    player.inventory.selectedSlot = 0;
    
    // Mock the updateInventoryUI method
    const updateInventoryUISpy = jest.spyOn(player, 'updateInventoryUI');
    updateInventoryUISpy.mockClear();
    
    // Call the method
    player.selectInventorySlot(2);
    
    // Check that updateInventoryUI was called
    expect(updateInventoryUISpy).toHaveBeenCalled();
  });
  
  test('clicking on an inventory slot should select it', () => {
    // Set the selected slot
    player.inventory.selectedSlot = 0;
    
    // Call the method to create the UI
    player.updateInventoryUI();
    
    // Mock the selectInventorySlot method
    const selectSpy = jest.spyOn(player, 'selectInventorySlot');
    
    // Get all inventory slots
    const slots = document.querySelectorAll('.inventory-slot');
    
    // Check that slots were created
    expect(slots.length).toBe(player.inventory.slots.length);
    
    // Click on the third slot
    slots[2].click();
    
    // Check that the correct slot was selected
    expect(selectSpy).toHaveBeenCalledWith(2);
  });
}); 