# Airship Skirmish

A 3D web-based multiplayer airship battle game inspired by Movecraft. Build block-based airships, fight opponents, and explore a dynamic world.

## Features

- Enter a username and spawn into an airship.
- Block types: Lift (30% min), Armor, Engine, Cannon, Steering Wheel.
- Two modes: Ship Mode (WASD/QE) and Player Mode (FPV, WASD/Space/X).
- TNT cannons with 3-second fuse and fire spread mechanics.
- Sinking animation if Lift Blocks < 30%.
- Procedurally generated block-based world (0-500 elevation).
- Multiplayer with WebSockets, stats (username, kills) above ships.

## Controls

### Ship Mode
- W: Move forward
- S: Move backward
- A: Turn left (90°/second)
- D: Turn right (90°/second)
- Q: Ascend (1 elevation/second)
- E: Descend (1 elevation/second)
- R: Fire cannons (in the direction you're moving)
- F: Switch to Player Mode

### Player Mode
- Mouse: Look around
- WASD: Walk
- Spacebar: Jump (1 block height)
- X: Sneak (prevents falling off ship edges)
- Left Click: Break blocks
- Right Click: Place blocks (up to 4 blocks away)
- 1-9: Select inventory slot
- F: Switch to Ship Mode

## Block Types

### Lift Block
- Provides lift to keep the ship airborne
- Minimum 30% of total ship blocks must be Lift Blocks, or the ship sinks
- Flammable (like Minecraft wool), subject to fire spread
- Base health: 1 unit

### Armor Block
- Protects Lift Blocks when surrounding them
- Non-flammable
- Health: 4 units (4x that of Lift Blocks)

### Engine Block
- Enables movement (controlled in Ship Mode)
- Health: 12 units (3x that of Armor Blocks)

### Cannon Block
- Shoots TNT blocks with a slight arc
- Front-facing texture indicates firing direction
- TNT explodes after 3 seconds, damaging enemy ships
- Health: 12 units (equal to Engine Blocks)

### Steering Wheel Block
- Central, immovable block that the ship is built around
- Indestructible (infinite health)
- Camera anchor point in Ship Mode

## Tech Stack

- Three.js: 3D rendering
- Vite: Development/build
- WebSockets: Real-time multiplayer
- Vercel: Hosting
- GitHub: Version control

## Setup

1. Clone the repo: `git clone <repo-url>`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`
4. Build for production: `npm run build`
5. Deploy to Vercel: `vercel deploy`

## Ship Files

Ships are stored as JSON files in the `public/ships/` directory. You can create custom ships by editing these files. The format is:

```json
{
  "name": "Ship Name",
  "description": "Ship Description",
  "blocks": [
    {"type": "steeringWheel", "x": 0, "y": 0, "z": 0},
    {"type": "lift", "x": 1, "y": 0, "z": 0},
    {"type": "armor", "x": 2, "y": 0, "z": 0}
  ]
}
```

## Project Structure

```
airship-skirmish/
├── public/                   # Static assets (textures, default ship files)
│   ├── textures/            # Block textures
│   └── ships/               # Default ship designs (JSON files)
├── src/                     # Source code
│   ├── assets/             # Game assets (models, sounds)
│   ├── blocks/             # Block type definitions
│   │   ├── baseBlock.js
│   │   ├── liftBlock.js
│   │   ├── armorBlock.js
│   │   ├── engineBlock.js
│   │   ├── cannonBlock.js
│   │   ├── steeringWheel.js
│   │   └── blockFactory.js
│   ├── components/         # Reusable game components
│   │   ├── ship.js
│   │   └── player.js
│   ├── modes/              # Control mode logic
│   ├── multiplayer/        # WebSocket and multiplayer logic
│   ├── world/              # World generation and rendering
│   ├── utils/              # Helper functions
│   └── main.js             # Entry point
├── tests/                  # Unit and Playwright tests
├── index.html              # HTML entry point
├── vite.config.js          # Vite configuration
└── package.json            # Dependencies and scripts
```

## License

MIT

## Credits

Inspired by the Minecraft mod Movecraft by Bacca Yarro. 