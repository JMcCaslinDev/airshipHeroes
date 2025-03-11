/**
 * Ship Storage Module
 * 
 * Handles saving and loading ship designs from localStorage.
 */

/**
 * Create a ship storage manager
 * @returns {Object} - The ship storage manager
 */
export function createShipStorage() {
  return {
    /**
     * Save a ship design to localStorage
     * @param {string} username - The username of the player
     * @param {Object} shipDefinition - The ship definition to save
     */
    saveShip(username, shipDefinition) {
      try {
        // Create a storage key specific to this user
        const storageKey = `airshipHeroes_ship_${username}`;
        
        // Stringify the ship definition and save it
        localStorage.setItem(storageKey, JSON.stringify(shipDefinition));
        
        console.log(`Ship saved for user: ${username}`);
        return true;
      } catch (error) {
        console.error('Error saving ship to localStorage:', error);
        return false;
      }
    },
    
    /**
     * Load a ship design from localStorage
     * @param {string} username - The username of the player
     * @returns {Object|null} - The ship definition or null if not found
     */
    loadShip(username) {
      try {
        // Create a storage key specific to this user
        const storageKey = `airshipHeroes_ship_${username}`;
        
        // Get the ship definition from localStorage
        const shipData = localStorage.getItem(storageKey);
        
        if (shipData) {
          // Parse the ship definition
          const shipDefinition = JSON.parse(shipData);
          console.log(`Ship loaded for user: ${username}`);
          return shipDefinition;
        }
        
        console.log(`No saved ship found for user: ${username}`);
        return null;
      } catch (error) {
        console.error('Error loading ship from localStorage:', error);
        return null;
      }
    },
    
    /**
     * Check if a ship design exists in localStorage
     * @param {string} username - The username of the player
     * @returns {boolean} - Whether a ship design exists
     */
    shipExists(username) {
      // Create a storage key specific to this user
      const storageKey = `airshipHeroes_ship_${username}`;
      
      // Check if the ship definition exists in localStorage
      return localStorage.getItem(storageKey) !== null;
    },
    
    /**
     * Delete a ship design from localStorage
     * @param {string} username - The username of the player
     */
    deleteShip(username) {
      try {
        // Create a storage key specific to this user
        const storageKey = `airshipHeroes_ship_${username}`;
        
        // Remove the ship definition from localStorage
        localStorage.removeItem(storageKey);
        
        console.log(`Ship deleted for user: ${username}`);
        return true;
      } catch (error) {
        console.error('Error deleting ship from localStorage:', error);
        return false;
      }
    }
  };
} 