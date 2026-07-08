/**
 * Ship Storage Module
 *
 * Handles saving and loading ship designs from localStorage.
 * Each user gets SHIP_SLOT_COUNT build slots.
 */

export const SHIP_SLOT_COUNT = 5;

function slotKey(username, slot) {
  return `airshipHeroes_ship_${username}_${slot}`;
}

function activeSlotKey(username) {
  return `airshipHeroes_activeSlot_${username}`;
}

function legacyKey(username) {
  return `airshipHeroes_ship_${username}`;
}

function clampSlot(slot) {
  const n = Number(slot);
  if (!Number.isInteger(n) || n < 0 || n >= SHIP_SLOT_COUNT) {
    return 0;
  }
  return n;
}

/**
 * Create a ship storage manager
 * @returns {Object} - The ship storage manager
 */
export function createShipStorage() {
  function migrateLegacy(username) {
    const legacy = localStorage.getItem(legacyKey(username));
    if (!legacy) {
      return;
    }

    if (!localStorage.getItem(slotKey(username, 0))) {
      localStorage.setItem(slotKey(username, 0), legacy);
    }
    localStorage.removeItem(legacyKey(username));
  }

  return {
    SHIP_SLOT_COUNT,

    migrateLegacy,

    getActiveSlot(username) {
      migrateLegacy(username);
      const stored = localStorage.getItem(activeSlotKey(username));
      return stored === null ? 0 : clampSlot(Number(stored));
    },

    setActiveSlot(username, slot) {
      try {
        localStorage.setItem(activeSlotKey(username), String(clampSlot(slot)));
        return true;
      } catch (error) {
        console.error('Error saving active ship slot:', error);
        return false;
      }
    },

    /**
     * Save a ship design to localStorage
     * @param {string} username - The username of the player
     * @param {Object} shipDefinition - The ship definition to save
     * @param {number} [slot] - Slot index (0-4)
     */
    saveShip(username, shipDefinition, slot) {
      try {
        migrateLegacy(username);
        const resolvedSlot = slot === undefined ? this.getActiveSlot(username) : clampSlot(slot);
        localStorage.setItem(slotKey(username, resolvedSlot), JSON.stringify(shipDefinition));
        console.log(`Ship saved for user: ${username} slot ${resolvedSlot}`);
        return true;
      } catch (error) {
        console.error('Error saving ship to localStorage:', error);
        return false;
      }
    },

    /**
     * Load a ship design from localStorage
     * @param {string} username - The username of the player
     * @param {number} [slot] - Slot index (0-4)
     * @returns {Object|null} - The ship definition or null if not found
     */
    loadShip(username, slot) {
      try {
        migrateLegacy(username);
        const resolvedSlot = slot === undefined ? this.getActiveSlot(username) : clampSlot(slot);
        const shipData = localStorage.getItem(slotKey(username, resolvedSlot));

        if (shipData) {
          const shipDefinition = JSON.parse(shipData);
          console.log(`Ship loaded for user: ${username} slot ${resolvedSlot}`);
          return shipDefinition;
        }

        console.log(`No saved ship found for user: ${username} slot ${resolvedSlot}`);
        return null;
      } catch (error) {
        console.error('Error loading ship from localStorage:', error);
        return null;
      }
    },

    /**
     * Check if a ship design exists in localStorage
     * @param {string} username - The username of the player
     * @param {number} [slot] - Slot index (0-4)
     * @returns {boolean} - Whether a ship design exists
     */
    shipExists(username, slot) {
      migrateLegacy(username);
      const resolvedSlot = slot === undefined ? this.getActiveSlot(username) : clampSlot(slot);
      return localStorage.getItem(slotKey(username, resolvedSlot)) !== null;
    },

    /**
     * Delete a ship design from localStorage
     * @param {string} username - The username of the player
     * @param {number} [slot] - Slot index (0-4)
     */
    deleteShip(username, slot) {
      try {
        migrateLegacy(username);
        const resolvedSlot = slot === undefined ? this.getActiveSlot(username) : clampSlot(slot);
        localStorage.removeItem(slotKey(username, resolvedSlot));
        console.log(`Ship deleted for user: ${username} slot ${resolvedSlot}`);
        return true;
      } catch (error) {
        console.error('Error deleting ship from localStorage:', error);
        return false;
      }
    },

    /**
     * Summarize all ship slots for a user
     * @param {string} username
     * @returns {Array<{slot:number, empty:boolean, name:string, blockCount:number}>}
     */
    listSlots(username) {
      migrateLegacy(username);
      const slots = [];

      for (let i = 0; i < SHIP_SLOT_COUNT; i++) {
        const def = this.loadShip(username, i);
        slots.push({
          slot: i,
          empty: !def,
          name: def?.name || `Slot ${i + 1}`,
          blockCount: def?.blocks?.length || 0
        });
      }

      return slots;
    },

    /** Lowest empty slot index, or null if all full. */
    findFirstEmptySlot(username) {
      migrateLegacy(username);
      for (let i = 0; i < SHIP_SLOT_COUNT; i++) {
        if (!localStorage.getItem(slotKey(username, i))) {
          return i;
        }
      }
      return null;
    }
  };
}
