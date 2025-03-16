/**
 * PlayerUI Class
 * 
 * Manages the player's UI elements, including:
 * - Inventory display
 * - Mode indicator
 * - Stats display
 */

class PlayerUI {
  /**
   * Constructor for the PlayerUI class
   * @param {Object} player - The player instance
   */
  constructor(player) {
    this.player = player;
    
    // UI elements
    this.elements = {
      inventory: null,
      modeIndicator: null,
      stats: null
    };
  }

  /**
   * Initialize the UI elements
   */
  init() {
    // Get UI elements from the DOM
    this.elements.inventory = document.getElementById('inventory');
    this.elements.modeIndicator = document.getElementById('mode-indicator');
    this.elements.stats = document.getElementById('fps-counter'); // Using fps-counter as stats for now
    
    // Initial UI update
    this.update();
  }

  /**
   * Update all UI elements
   */
  update() {
    this.updateModeIndicator();
    this.updateStats();
    this.updateInventory();
  }

  /**
   * Update the mode indicator
   */
  updateModeIndicator() {
    if (this.elements.modeIndicator) {
      this.elements.modeIndicator.textContent = this.player.mode === 'ship' ? 'Ship Mode' : 'Player Mode';
    }
  }

  /**
   * Update the stats display
   */
  updateStats() {
    if (this.elements.stats) {
      this.elements.stats.textContent = `${this.player.username} | Kills: ${this.player.kills} | Deaths: ${this.player.deaths}`;
    }
  }

  /**
   * Update the inventory display
   */
  updateInventory() {
    // Update inventory visibility
    if (this.elements.inventory) {
      this.elements.inventory.style.display = this.player.mode === 'player' ? 'block' : 'none';
    }
    
    // Update inventory slots
    this.updateInventorySlots();
    
    // Update body class based on mode
    document.body.classList.remove('player-mode', 'ship-mode');
    document.body.classList.add(`${this.player.mode}-mode`);
  }

  /**
   * Update the inventory slots
   */
  updateInventorySlots() {
    console.log("Updating inventory UI");
    
    // Get the inventory container
    const inventoryContainer = this.elements.inventory;
    if (!inventoryContainer) {
      console.error("Inventory container not found");
      return;
    }
    
    // Clear existing slots
    inventoryContainer.innerHTML = '';
    
    // Create slots
    for (let i = 0; i < this.player.inventory.slots.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.dataset.slot = i;
      
      // Mark as selected if this is the selected slot
      if (i === this.player.inventory.selectedSlot) {
        slot.classList.add('selected');
      }
      
      // Add slot number
      const slotNumber = document.createElement('div');
      slotNumber.className = 'slot-number';
      slotNumber.textContent = (i + 1).toString();
      slot.appendChild(slotNumber);
      
      // Add item if slot is not empty
      const item = this.player.inventory.slots[i];
      if (item) {
        this.createItemElement(slot, item);
      }
      
      // Add click event to select this slot
      slot.addEventListener('click', () => {
        if (this.player.mode === 'player') {
          this.player.inventory.selectSlot(i);
          this.player.selectedBlock = this.player.inventory.getSelectedBlock();
          this.updateInventory();
        }
      });
      
      // Add slot to inventory container
      inventoryContainer.appendChild(slot);
    }
  }

  /**
   * Create an item element for the inventory
   * @param {HTMLElement} slot - The slot element to add the item to
   * @param {Object} item - The item data
   */
  createItemElement(slot, item) {
    // Create item element
    const itemElement = document.createElement('div');
    itemElement.className = 'inventory-item';
    
    // Try to set background image using the resource loader
    let textureApplied = false;
    try {
      const resourceLoader = window.resourceLoader;
      if (resourceLoader && typeof resourceLoader.getUrl === 'function') {
        const textureUrl = resourceLoader.getUrl(item.type);
        if (textureUrl) {
          // Use the texture URL directly
          itemElement.style.backgroundImage = `url(${textureUrl})`;
          itemElement.style.backgroundSize = '80%';
          itemElement.style.backgroundPosition = 'center';
          itemElement.style.backgroundRepeat = 'no-repeat';
          textureApplied = true;
          
          // Add a subtle border and shadow for 3D effect even with texture
          itemElement.style.border = '1px solid rgba(255,255,255,0.3)';
          itemElement.style.boxShadow = 'inset 0 0 8px rgba(0, 0, 0, 0.3)';
        }
      }
    } catch (error) {
      console.warn(`Failed to load texture for ${item.type}:`, error);
    }
    
    // If texture loading failed, use a color fallback with a 3D-like appearance
    if (!textureApplied) {
      this.applyFallbackItemStyle(itemElement, item.type);
    }
    
    // Add item count if more than 1
    if (item.count > 1) {
      this.addItemCountElement(itemElement, item.count);
    }
    
    // Add item name tooltip
    itemElement.title = `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} (${item.count})`;
    
    // Add item to slot
    slot.appendChild(itemElement);
  }

  /**
   * Apply fallback styling to an item element
   * @param {HTMLElement} itemElement - The item element
   * @param {String} itemType - The type of item
   */
  applyFallbackItemStyle(itemElement, itemType) {
    let backgroundColor;
    let borderTopColor;
    let borderLeftColor;
    let borderRightColor;
    let borderBottomColor;
    let itemIcon = '';
    
    switch (itemType) {
      case 'wood':
        backgroundColor = '#8B4513';
        borderTopColor = '#A0522D';
        borderLeftColor = '#A0522D';
        borderRightColor = '#654321';
        borderBottomColor = '#654321';
        itemIcon = '🪵';
        break;
      case 'stone':
        backgroundColor = '#808080';
        borderTopColor = '#A0A0A0';
        borderLeftColor = '#A0A0A0';
        borderRightColor = '#606060';
        borderBottomColor = '#606060';
        itemIcon = '🧱';
        break;
      case 'lift':
        backgroundColor = '#FFD700';
        borderTopColor = '#FFF700';
        borderLeftColor = '#FFF700';
        borderRightColor = '#DAA520';
        borderBottomColor = '#DAA520';
        itemIcon = '🎈';
        break;
      case 'cannon':
        backgroundColor = '#696969';
        borderTopColor = '#808080';
        borderLeftColor = '#808080';
        borderRightColor = '#505050';
        borderBottomColor = '#505050';
        itemIcon = '💣';
        break;
      case 'control':
        backgroundColor = '#8B0000';
        borderTopColor = '#A52A2A';
        borderLeftColor = '#A52A2A';
        borderRightColor = '#800000';
        borderBottomColor = '#800000';
        itemIcon = '🎮';
        break;
      default:
        backgroundColor = '#AAAAAA';
        borderTopColor = '#CCCCCC';
        borderLeftColor = '#CCCCCC';
        borderRightColor = '#888888';
        borderBottomColor = '#888888';
        itemIcon = '📦';
        break;
    }
    
    // Apply 3D-like styles
    itemElement.style.backgroundColor = backgroundColor;
    itemElement.style.borderTop = `2px solid ${borderTopColor}`;
    itemElement.style.borderLeft = `2px solid ${borderLeftColor}`;
    itemElement.style.borderRight = `2px solid ${borderRightColor}`;
    itemElement.style.borderBottom = `2px solid ${borderBottomColor}`;
    itemElement.style.boxShadow = 'inset 0 0 10px rgba(0, 0, 0, 0.4)';
    
    // Add icon as fallback
    if (itemIcon) {
      const iconElement = document.createElement('div');
      iconElement.className = 'item-icon';
      iconElement.textContent = itemIcon;
      iconElement.style.fontSize = '24px';
      iconElement.style.textAlign = 'center';
      iconElement.style.lineHeight = '40px';
      itemElement.appendChild(iconElement);
    }
  }

  /**
   * Add a count element to an item
   * @param {HTMLElement} itemElement - The item element
   * @param {Number} count - The item count
   */
  addItemCountElement(itemElement, count) {
    const countElement = document.createElement('div');
    countElement.className = 'item-count';
    countElement.textContent = count.toString();
    countElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    countElement.style.color = 'white';
    countElement.style.borderRadius = '50%';
    countElement.style.padding = '2px 6px';
    countElement.style.position = 'absolute';
    countElement.style.bottom = '2px';
    countElement.style.right = '2px';
    countElement.style.fontSize = '12px';
    countElement.style.fontWeight = 'bold';
    itemElement.appendChild(countElement);
  }
}

export default PlayerUI; 