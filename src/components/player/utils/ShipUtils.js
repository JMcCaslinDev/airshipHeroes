/**
 * Ship Utilities
 * 
 * Functions for managing ship-related operations
 */

/**
 * Validate the ship's block-mesh positions
 * @param {Object} ship - The ship instance
 * @returns {Number} - The number of fixed block positions
 */
export function validateShipBlocks(ship) {
  if (ship) {
    console.log("Validating ship blocks...");
    const fixedCount = ship.validateBlockMeshPositions();
    console.log(`Validation fixed ${fixedCount} block positions`);
    return fixedCount;
  }
  return 0;
}

/**
 * Clean up the ship to remove any ghost blocks
 * @param {Object} ship - The ship instance
 * @returns {Object} - The cleanup result
 */
export function cleanupShip(ship) {
  if (!ship) return { removed: 0, orphaned: 0 };
  
  console.log("Cleaning up ship...");
  
  // Fix any texture issues with blocks
  if (typeof ship.fixBlockTextureIssues === 'function') {
    const fixedCount = ship.fixBlockTextureIssues();
    console.log(`Fixed textures for ${fixedCount} blocks during cleanup`);
  }
  
  // Clean up orphaned meshes
  const result = ship.cleanupOrphanedMeshes();
  console.log(`Cleanup result: ${JSON.stringify(result)}`);
  return result;
}

/**
 * Save the ship to localStorage
 * @param {Object} ship - The ship instance
 * @param {Object} shipStorage - The ship storage instance
 * @param {String} username - The player's username
 * @returns {Boolean} - Whether the ship was successfully saved
 */
export function saveShipToStorage(ship, shipStorage, username, slot) {
  if (ship && shipStorage && username) {
    try {
      const shipDefinition = ship.serialize();
      shipStorage.saveShip(username, shipDefinition, slot);
      console.log("Ship saved to localStorage");
      return true;
    } catch (error) {
      console.error("Error saving ship to localStorage:", error);
    }
  }
  return false;
} 