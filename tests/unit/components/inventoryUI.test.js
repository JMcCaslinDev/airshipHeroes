/**
 * Inventory UI Tests
 * 
 * Tests for inventory UI functionality.
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

describe('Inventory UI', () => {
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
  });
  
  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.clearAllMocks();
    delete window.resourceLoader;
  });
  
  test('updateInventoryUI should create the correct number of slots', () => {
    // Call the method
    player.updateInventoryUI();
    
    // Get all inventory slots
    const slots = document.querySelectorAll('.inventory-slot');
    
    // Check that the correct number of slots were created
    expect(slots.length).toBe(player.inventory.slots.length);
  });
  
  test('updateInventoryUI should highlight the selected slot', () => {
    // Set the selected slot
    player.inventory.selectedSlot = 2;
    
    // Call the method
    player.updateInventoryUI();
    
    // Get all inventory slots
    const slots = document.querySelectorAll('.inventory-slot');
    
    // Check that only the selected slot has the 'selected' class
    slots.forEach((slot, index) => {
      if (index === 2) {
        expect(slot.classList.contains('selected')).toBe(true);
      } else {
        expect(slot.classList.contains('selected')).toBe(false);
      }
    });
  });
  
  test('updateInventoryUI should display item counts correctly', () => {
    // Call the method
    player.updateInventoryUI();
    
    // Get all inventory slots
    const slots = document.querySelectorAll('.inventory-slot');
    
    // Check that item counts are displayed correctly
    player.inventory.slots.forEach((item, index) => {
      if (item && item.count > 1) {
        const countElement = slots[index].querySelector('.item-count');
        expect(countElement).not.toBeNull();
        expect(countElement.textContent).toBe(item.count.toString());
      }
    });
  });
  
  test('updateInventoryUI should apply textures to items', () => {
    // Call the method
    player.updateInventoryUI();
    
    // Get all inventory slots
    const slots = document.querySelectorAll('.inventory-slot');
    
    // Check that textures are applied correctly
    player.inventory.slots.forEach((item, index) => {
      if (item) {
        const itemElement = slots[index].querySelector('.inventory-item');
        expect(itemElement).not.toBeNull();
        expect(itemElement.style.backgroundImage).toContain(item.type);
      }
    });
  });
  
  test('updateInventoryUI should handle empty slots correctly', () => {
    // Call the method
    player.updateInventoryUI();
    
    // Get all inventory slots
    const slots = document.querySelectorAll('.inventory-slot');
    
    // Check that empty slots don't have item elements
    player.inventory.slots.forEach((item, index) => {
      if (!item) {
        const itemElement = slots[index].querySelector('.inventory-item');
        expect(itemElement).toBeNull();
      }
    });
  });
  
  test('updateInventoryUI should update when selected slot changes', () => {
    // Initial setup
    player.inventory.selectedSlot = 0;
    player.updateInventoryUI();
    
    // Check initial state
    let slots = document.querySelectorAll('.inventory-slot');
    expect(slots[0].classList.contains('selected')).toBe(true);
    
    // Change selected slot
    player.inventory.selectedSlot = 2;
    player.updateInventoryUI();
    
    // Check updated state
    slots = document.querySelectorAll('.inventory-slot');
    expect(slots[0].classList.contains('selected')).toBe(false);
    expect(slots[2].classList.contains('selected')).toBe(true);
  });
  
  test('updateSelectedSlotUI should update the selected slot without recreating the UI', () => {
    // Set up initial state
    player.inventory.selectedSlot = 0;
    player.updateInventoryUI();
    
    // Get initial slots
    const initialSlots = document.querySelectorAll('.inventory-slot');
    expect(initialSlots[0].classList.contains('selected')).toBe(true);
    
    // Call the method to update the selected slot
    player.updateSelectedSlotUI(0, 2);
    
    // Get updated slots
    const updatedSlots = document.querySelectorAll('.inventory-slot');
    
    // Check that the slots are the same DOM elements (UI wasn't recreated)
    expect(updatedSlots.length).toBe(initialSlots.length);
    expect(updatedSlots[0]).toBe(initialSlots[0]);
    
    // Check that the selected class was moved from slot 0 to slot 2
    expect(updatedSlots[0].classList.contains('selected')).toBe(false);
    expect(updatedSlots[2].classList.contains('selected')).toBe(true);
  });
  
  test('updateSelectedSlotUI should handle invalid slot indices', () => {
    // Set up initial state
    player.inventory.selectedSlot = 0;
    player.updateInventoryUI();
    
    // Call the method with an invalid new slot index
    player.updateSelectedSlotUI(0, 10);
    
    // Check that an error was logged
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid new slot index'));
    
    // Check that the selected class was removed from slot 0
    const slots = document.querySelectorAll('.inventory-slot');
    expect(slots[0].classList.contains('selected')).toBe(false);
  });
  
  test('updateSelectedSlotUI should recreate the UI if no slots are found', () => {
    // Clear the inventory container
    document.getElementById('inventory').innerHTML = '';
    
    // Mock updateInventoryUI
    const updateUISpy = jest.spyOn(player, 'updateInventoryUI');
    
    // Call the method
    player.updateSelectedSlotUI(0, 2);
    
    // Check that updateInventoryUI was called
    expect(updateUISpy).toHaveBeenCalled();
  });
  
  test('selectInventorySlot should call updateSelectedSlotUI instead of updateInventoryUI', () => {
    // Set up initial state
    player.inventory.selectedSlot = 0;
    player.updateInventoryUI();
    
    // Mock the methods
    const updateSelectedSlotUISpy = jest.spyOn(player, 'updateSelectedSlotUI');
    const updateInventoryUISpy = jest.spyOn(player, 'updateInventoryUI');
    
    // Call the method
    player.selectInventorySlot(2);
    
    // Check that updateSelectedSlotUI was called with the correct parameters
    expect(updateSelectedSlotUISpy).toHaveBeenCalledWith(0, 2);
    
    // Check that updateInventoryUI was not called directly
    expect(updateInventoryUISpy).not.toHaveBeenCalled();
  });
  
  test('updateInventoryUI should handle texture loading errors gracefully', () => {
    // Mock resourceLoader to simulate a texture loading error
    window.resourceLoader.getUrl.mockImplementation(() => null);
    
    // Call the method
    player.updateInventoryUI();
    
    // Get all inventory slots
    const slots = document.querySelectorAll('.inventory-slot');
    
    // Check that fallback styling is applied
    player.inventory.slots.forEach((item, index) => {
      if (item) {
        const itemElement = slots[index].querySelector('.inventory-item');
        expect(itemElement).not.toBeNull();
        expect(itemElement.style.backgroundImage).toBe('');
        expect(itemElement.style.backgroundColor).not.toBe('');
      }
    });
  });
}); 