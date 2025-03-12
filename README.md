# Airship Skirmish

A 3D multiplayer airship battle game built with Three.js and WebSockets.

## Features

- Build and customize your own airship using various block types
- Engage in aerial combat with other players
- Switch between ship mode and player mode
- Collect resources and expand your fleet
- Real-time multiplayer battles with 100+ concurrent users
- Persistent world with saved ship designs

## Block Types

- **Wood Block**: Basic building material
- **Stone Block**: Durable building material
- **Lift Block**: Provides lift to keep your ship airborne (must be at least 30% of total blocks)
- **Cannon Block**: Fires projectiles at enemy ships
- **Control Block**: Required for ship control (steering wheel)

## Controls

### Ship Mode
- `W` - Forward thrust
- `S` - Backward thrust
- `A` - Turn left
- `D` - Turn right
- `Q` - Roll left
- `E` - Roll right
- `Space` - Fire cannons
- `Tab` - Switch to Player Mode

### Player Mode
- `W` - Move forward
- `S` - Move backward
- `A` - Move left
- `D` - Move right
- `Space` - Jump
- `X` - Sneak
- `Left Click` - Break block
- `Right Click` - Place block
- `1-9` - Select inventory slot
- `Tab` - Switch to Ship Mode

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/airship-skirmish.git
   cd airship-skirmish
   ```

2. Install dependencies
   ```
   npm install
   ```

### Running Locally

You have several options to run the game locally:

#### Option 1: Development Mode with Hot Reloading (Recommended for Development)

This runs both the client and server with hot reloading for the client:

```
npm run dev:all
```

This will start:
- Vite development server on port 3000
- Multiplayer server on port 3001
- Automatic proxy configuration for WebSocket communication

Open your browser and navigate to `http://localhost:3000`

#### Option 2: Development Mode (Client Only)

This runs the client in development mode with hot reloading:

```
npm run dev
```

Open your browser and navigate to `http://localhost:3000`

#### Option 3: Full Stack (Client + Server)

This builds the client and starts the multiplayer server:

```
npm run start
```

Open your browser and navigate to `http://localhost:3001`

#### Option 4: Run Client and Server Separately

In one terminal, start the client:
```
npm run dev
```

In another terminal, start the server:
```
npm run server
```

Open your browser and navigate to `http://localhost:3000`

### Building for Production

```
npm run build
```

The built files will be in the `dist` directory.

## Testing

Run the test suite:

```
npm test
```

## Ship File Format

Ships are stored in JSON format with the following structure:

```json
{
  "name": "My Ship",
  "blocks": [
    {"x": 0, "y": 0, "z": 0, "type": "control"},
    {"x": 1, "y": 0, "z": 0, "type": "wood"},
    {"x": -1, "y": 0, "z": 0, "type": "wood"},
    {"x": 0, "y": 0, "z": 1, "type": "wood"},
    {"x": 0, "y": 0, "z": -1, "type": "wood"},
    {"x": 0, "y": -1, "z": 0, "type": "lift"},
    {"x": 1, "y": -1, "z": 0, "type": "lift"},
    {"x": -1, "y": -1, "z": 0, "type": "lift"},
    {"x": 0, "y": -1, "z": 1, "type": "cannon"},
    {"x": 0, "y": -1, "z": -1, "type": "cannon"}
  ]
}
```

## Multiplayer Features

- Real-time ship movement and combat
- Player joining and leaving notifications
- Ship design synchronization between players
- Persistent world blocks shared between all players
- Automatic cleanup of inactive players
- Ship designs saved to browser's localStorage

## Performance Optimizations

- WebSocket transport for low-latency communication
- Compression of HTTP responses
- Optimized 3D rendering with Three.js
- Circular world design with height limit of 500 blocks
- Efficient block updates with minimal network traffic

## License

This project is licensed under the MIT License - see the LICENSE file for details. 