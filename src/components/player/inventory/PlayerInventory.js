/**
 * PlayerInventory Class
 * 
 * Manages the player's inventory, including:
 * - Inventory slots and items
 * - Adding and removing items
 * - Selecting slots
 * - Saving and loading inventory state
 */

class PlayerInventory {
  /**
   * Constructor for the PlayerInventory class
   */
  constructor() {
    this.slots = Array(9).fill(null);
    this.selectedSlot = 0;
    this.maxStackSize = 999;
    this.infiniteBlocks = true;
  }

  /**
   * Initialize the inventory with default blocks
   */
  initialize() {
    // Add some default blocks to the inventory
    const defaultBlocks = [
      { type: 'wood', count: 999 },
      { type: 'stone', count: 999 },
      { type: 'lift', count: 999 },
      { type: 'cannon', count: 999 },
      { type: 'control', count: 999 }
    ];
    
    // Add each block type to the inventory
    defaultBlocks.forEach((block, index) => {
      if (index < this.slots.length) {
        this.slots[index] = block;
      } else {
        // If we have more block types than slots, just add them to the inventory
        this.addItem(block);
      }
    });
  }

  /**
   * Select an inventory slot
   * @param {number} slotIndex - The index of the slot to select (0-8)
   * @returns {Object|null} - The selected block or null if slot is empty
   */
  selectSlot(slotIndex) {
    // Validate slot index
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      console.error(`Invalid slot index: ${slotIndex}`);
      return null;
    }
    
    // Update selected slot
    this.selectedSlot = slotIndex;
    
    // Get the selected block
    const selectedBlock = this.getSelectedBlock();
    
    // Save inventory state
    this.save();
    
    return selectedBlock;
  }

  /**
   * Get the currently selected block
   * @returns {Object|null} - The selected block or null if slot is empty
   */
  getSelectedBlock() {
    const slotContent = this.slots[this.selectedSlot];
    
    if (slotContent) {
      return { 
        type: slotContent.type, 
        count: slotContent.count 
      };
    }
    
    return null;
  }

  /**
   * Add an item to the inventory
   * @param {Object} item - The item to add
   * @returns {Boolean} - Whether the item was successfully added
   */
  addItem(item) {
    // Find an existing stack of the same type that isn't full
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      
      if (slot && slot.type === item.type && slot.count < this.maxStackSize) {
        // Add to existing stack
        slot.count++;
        this.save();
        return true;
      }
    }
    
    // Find an empty slot
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i]) {
        // Add to empty slot
        this.slots[i] = {
          type: item.type,
          count: 1
        };
        this.save();
        return true;
      }
    }
    
    // Inventory is full
    return false;
  }

  /**
   * Remove an item from the inventory
   * @param {number} slotIndex - The index of the slot to remove from
   * @param {number} count - The number of items to remove
   * @returns {Boolean} - Whether the item was successfully removed
   */
  removeItem(slotIndex, count = 1) {
    if (slotIndex >= 0 && slotIndex < this.slots.length) {
      const slot = this.slots[slotIndex];
      
      if (slot) {
        // If infinite blocks is enabled, don't let count go below 1
        if (this.infiniteBlocks) {
          // Just for visual feedback, reduce the count but keep at least 1
          slot.count = Math.max(1, slot.count - count);
        } else {
          // Normal behavior - actually reduce the count
          slot.count -= count;
          
          // Remove slot if empty
          if (slot.count <= 0) {
            this.slots[slotIndex] = null;
          }
        }
        
        this.save();
        return true;
      }
    }
    
    return false;
  }

  /**
   * Save the inventory state to local storage
   * @param {String} username - The player's username
   */
  save(username) {
    if (username) {
      try {
        // Create a serializable version of the inventory
        const inventoryData = {
          slots: this.slots,
          selectedSlot: this.selectedSlot,
          maxStackSize: this.maxStackSize,
          infiniteBlocks: this.infiniteBlocks
        };
        
        // Save to local storage
        localStorage.setItem(`inventory_${username}`, JSON.stringify(inventoryData));
        console.log("Inventory saved to localStorage");
      } catch (error) {
        console.error("Error saving inventory to localStorage:", error);
      }
    }
  }
  
  /**
   * Load the inventory state from local storage
   * @param {String} username - The player's username
   * @returns {Boolean} - Whether the inventory was successfully loaded
   */
  load(username) {
    if (username) {
      try {
        // Get from local storage
        const inventoryData = localStorage.getItem(`inventory_${username}`);
        
        if (inventoryData) {
          // Parse the data
          const parsedData = JSON.parse(inventoryData);
          
          // Update the inventory
          this.slots = parsedData.slots;
          this.selectedSlot = parsedData.selectedSlot;
          this.maxStackSize = parsedData.maxStackSize;
          this.infiniteBlocks = parsedData.infiniteBlocks !== undefined ? 
            parsedData.infiniteBlocks : true; // Default to true if not specified
          
          console.log("Inventory loaded from localStorage");
          return true;
        }
      } catch (error) {
        console.error("Error loading inventory from localStorage:", error);
      }
    }
    
    return false;
  }
}

export default PlayerInventory; 