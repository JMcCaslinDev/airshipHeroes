/**
 * Riding vs freefall helpers for player-on-ship.
 * ponytail: pure predicates for tests — movement lives in playerMode.
 */

export function shouldDetachFromDeck({ grounded, aboveDeck, motionY }) {
  return !grounded && !aboveDeck && motionY <= 0;
}

export function inheritShipExitVelocity(shipVelocity, walkVelocity) {
  return {
    x: (shipVelocity?.x ?? 0) + (walkVelocity?.x ?? 0),
    z: (shipVelocity?.z ?? 0) + (walkVelocity?.z ?? 0)
  };
}
