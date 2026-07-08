/**
 * Camera Utilities
 * 
 * Functions for managing the camera in different player modes
 */

/**
 * Update the camera position and rotation based on player mode
 * @param {Object} player - The player instance
 */
export function updateCamera(player) {
  try {
    if (!player.camera) return;
    
    if (player.mode === 'ship') {
      updateShipModeCamera(player);
    } else {
      updatePlayerModeCamera(player);
    }
  } catch (error) {
    console.error('Error in updateCamera:', error);
  }
}

/**
 * Update the camera for Ship Mode (third-person)
 * ponytail: orbit camera owned by shipModeController — do not override here.
 */
function updateShipModeCamera(_player) {
  // no-op
}

/**
 * Update the camera for Player Mode (first-person)
 * ponytail: playerModeController owns player camera — do not override here.
 */
function updatePlayerModeCamera(_player) {
  // no-op
} 