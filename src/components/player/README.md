# Player Module

This module manages player functionality for Airship Skirmish, including player modes, inventory, controls, and UI.

## Structure

The player module is organized into the following components:

```
player/
├── controls/
│   ├── BlockInteractions.js  # Handles block breaking and placement
│   └── PlayerControls.js     # Manages keyboard and mouse input
├── inventory/
│   └── PlayerInventory.js    # Manages inventory slots and items
├── modes/
│   └── PlayerCharacter.js    # Handles player character in Player Mode
├── ui/
│   └── PlayerUI.js           # Manages UI elements and display
├── utils/
│   ├── CameraUtils.js        # Camera positioning and updates
│   └── ShipUtils.js          # Ship-related utility functions
└── index.js                  # Main Player class that coordinates components
```

## Usage

Import the Player class from the module:

```javascript
import Player from './components/player';

// Create a new player
const player = new Player({
  username: 'PlayerName',
  camera: camera, // Three.js camera
  shipStorage: shipStorage // Optional ship storage instance
});

// Initialize the player
player.init(scene, camera);

// Update the player in the game loop
function gameLoop(deltaTime) {
  player.update(deltaTime, scene);
}
```

## Player Modes

The player can be in one of two modes:

1. **Ship Mode**: Controls the airship in third-person view
2. **Player Mode**: Controls the character in first-person view for block placement

Toggle between modes using the `B` key.

## Controls

### Ship Mode
- `W/A/S/D`: Move the ship forward/left/backward/right
- `Q/E`: Move the ship up/down
- `R`: Fire cannons (when facing a direction)

### Player Mode
- `W/A/S/D`: Move the character
- `Space`: Jump
- `X`: Sneak
- `1-9`: Select inventory slot
- `Left Click`: Break block
- `Right Click`: Place block

## Components

### PlayerInventory
Manages the player's inventory, including slots, items, and persistence.

### PlayerControls
Handles keyboard and mouse input for both Ship Mode and Player Mode.

### PlayerCharacter
Manages the player character in Player Mode, including physics and collision detection.

### PlayerUI
Handles UI elements like inventory display, mode indicator, and stats.

### BlockInteractions
Manages block breaking and placement in Player Mode.

### CameraUtils
Handles camera positioning and updates for both modes.

### ShipUtils
Provides utility functions for ship validation and cleanup.

## Customization

The player module can be customized by modifying the following properties:

- `maxPlaceDistance`: Maximum distance for block placement (default: 5)
- `inventory.maxStackSize`: Maximum stack size for inventory items (default: 999)
- `inventory.infiniteBlocks`: Whether blocks are infinite (default: true) 