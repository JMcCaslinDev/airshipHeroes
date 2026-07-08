/**
 * Player visual toggles. Server config can overwrite showPlayerOutline on connect later.
 */
export const playerVisualConfig = {
  showPlayerOutline: false
};

export function setShowPlayerOutline(show, character = null) {
  playerVisualConfig.showPlayerOutline = Boolean(show);
  if (!character?.viewMode) {
    return;
  }
  if (character.viewMode === 'ship-marker' && character.shipModeShip) {
    character.showShipModeOutline(character.position, character.shipModeShip);
    return;
  }
  character.setViewMode(character.viewMode);
}
