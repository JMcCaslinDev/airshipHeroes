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
 * @param {Object} player - The player instance
 */
function updatePlayerModeCamera(player) {
  player.camera.position.set(
    player.character.position.x,
    player.character.position.y + 1.6, // Eye level
    player.character.position.z
  );
  
  // Apply camera rotation
  player.camera.rotation.order = 'YXZ'; // This order is important for first-person controls
  player.camera.rotation.x = player.cameraRotation.x;
  player.camera.rotation.y = player.cameraRotation.y;
  player.camera.rotation.z = 0;
  
  // Update the camera's matrices to ensure they're current
  player.camera.updateProjectionMatrix();
  player.camera.updateMatrixWorld();
} 