/**
 * PlayerControls Class
 *
 * Holds control state and block interactions. Keyboard/mouse input is handled
 * by inputHandler + mode controllers (single input path).
 */

import BlockInteractions from './BlockInteractions.js';

class PlayerControls {
  constructor(player) {
    this.player = player;

    this.state = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      sneak: false,
      fire: false,
      dispenserPulse: false
    };

    this.blockInteractions = new BlockInteractions(player);
  }

  /**
   * DOM setup that does not duplicate keyboard/mouse (those go through inputHandler).
   */
  setupEventListeners() {
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    const inventorySlots = document.querySelectorAll('.inventory-slot');
    inventorySlots.forEach((slot, index) => {
      slot.addEventListener('click', () => {
        if (this.player.mode === 'player') {
          this.player.inventory.selectSlot(index);
          this.player.ui.updateInventory();
        }
      });
    });
  }
}

export default PlayerControls;
