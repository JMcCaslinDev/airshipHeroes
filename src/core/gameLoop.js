/**
 * Game Loop Module
 * 
 * Manages the game loop and timing.
 */

/**
 * Game loop module for handling the main game loop
 */

/**
 * Create a game loop
 * @param {Object} options - Options for the game loop
 * @param {Function} options.update - Function to call for updating game state
 * @param {Function} options.render - Function to call for rendering
 * @param {Function} [options.onFpsUpdate] - Function to call when FPS is updated
 * @returns {Object} The game loop controller
 */
export function createGameLoop(options = {}) {
  const { update, render, onFpsUpdate } = options;
  
  // Game loop state
  let running = false;
  let lastTime = 0;
  let frameCount = 0;
  let fpsTime = 0;
  let fps = 0;
  let animationFrameId = null;
  
  /**
   * Start the game loop
   */
  function start() {
    if (!running) {
      running = true;
      lastTime = performance.now();
      frameCount = 0;
      fpsTime = 0;
      animationFrameId = requestAnimationFrame(loop);
    }
  }
  
  /**
   * Stop the game loop
   */
  function stop() {
    if (running) {
      running = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  }
  
  /**
   * The main loop function
   * @param {number} time - Current timestamp
   */
  function loop(time) {
    // Calculate delta time in seconds
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    // Update FPS counter
    frameCount++;
    fpsTime += deltaTime;
    if (fpsTime >= 1) {
      fps = Math.round(frameCount / fpsTime);
      frameCount = 0;
      fpsTime = 0;
      
      if (onFpsUpdate) {
        onFpsUpdate(fps);
      }
    }
    
    // Update game state
    if (update) {
      update(deltaTime);
    }
    
    // Render the scene
    if (render) {
      render();
    }
    
    // Continue the loop if still running
    if (running) {
      animationFrameId = requestAnimationFrame(loop);
    }
  }
  
  return {
    start,
    stop,
    get fps() {
      return fps;
    },
    get isRunning() {
      return running;
    }
  };
} 