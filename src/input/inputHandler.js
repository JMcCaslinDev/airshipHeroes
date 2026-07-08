/**
 * Input Handler Module
 * 
 * Manages keyboard and mouse input for the game.
 */

/**
 * Create an input handler
 * @param {Object} options - Options for the input handler
 * @param {HTMLElement} options.element - The element to attach event listeners to
 * @param {Function} options.onMouseMove - Callback for mouse move events
 * @param {Function} options.onMouseDown - Callback for mouse down events
 * @param {Function} options.onMouseUp - Callback for mouse up events
 * @param {Function} options.onMouseWheel - Callback for mouse wheel events
 * @returns {Object} The input handler
 */
export function createInputHandler(options = {}) {
  let interactionElement = options.element || document;
  let pointerLockTarget = options.pointerLockTarget || null;
  
  // Input states
  const keys = {
    // Movement keys
    forward: false, // W
    backward: false, // S
    left: false, // A
    right: false, // D
    
    // Action keys
    up: false, // Space (jump)
    down: false, // X (sneak)
    sprint: false, // Shift
    q: false, // Q (up in ship mode)
    e: false, // E (down in ship mode)
    fire: false, // F
    
    // Mode keys
    toggleMode: false, // B
    
    // Inventory keys
    slot1: false, // 1
    slot2: false, // 2
    slot3: false, // 3
    slot4: false, // 4
    slot5: false, // 5
    slot6: false, // 6
    slot7: false, // 7
    slot8: false, // 8
    slot9: false, // 9
    
    // UI keys
    inventory: false, // I
    map: false, // M
    chat: false, // T
    escape: false, // Escape
    toggleCamera: false, // F5 — first / third person
  };
  
  // Mouse states
  const mouse = {
    x: 0,
    y: 0,
    leftButton: false,
    rightButton: false,
    middleButton: false
  };
  
  // Callbacks
  const onMouseMove = options.onMouseMove || (() => {});
  const onMouseDown = options.onMouseDown || (() => {});
  const onMouseUp = options.onMouseUp || (() => {});
  const onMouseWheel = options.onMouseWheel || (() => {});
  
  /**
   * Initialize the input handler
   */
  function init() {
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    bindPointerListeners(interactionElement, pointerLockTarget);
    
    // Add direct event listener for number keys (1-9) for inventory selection
    window.addEventListener('keydown', (event) => {
      // Only handle number keys 1-9
      if (event.code && event.code.startsWith('Digit') && event.code !== 'Digit0') {
        // Check if we're in player mode before dispatching the event
        const gameState = window.gameState; // Access the global game state
        if (gameState && gameState.localPlayer && gameState.localPlayer.mode === 'player') {
          const slotNumber = parseInt(event.code.replace('Digit', '')) - 1;
          console.log('Direct key handler: pressed', event.code, 'for slot', slotNumber, 'in player mode');
          
          // Dispatch a custom event for inventory selection
          const inventoryEvent = new CustomEvent('inventorySelect', {
            detail: { slot: slotNumber }
          });
          window.dispatchEvent(inventoryEvent);
        } else {
          console.log('Ignoring number key in ship mode:', event.code);
        }
      }
    });
  }
  
  /**
   * Handle key down events
   * @param {KeyboardEvent} event - The key event
   */
  function handleKeyDown(event) {
    if (!event.code) return;
    
    updateKeyState(event.code, true);
    
    // Prevent default for game controls
    if (isGameControl(event.code)) {
      event.preventDefault();
    }
  }
  
  /**
   * Handle key up events
   * @param {KeyboardEvent} event - The key event
   */
  function handleKeyUp(event) {
    if (!event.code) return;
    
    updateKeyState(event.code, false);
  }
  
  /**
   * Update key state
   * @param {string} code - The key code
   * @param {boolean} isDown - Whether the key is down
   */
  function updateKeyState(code, isDown) {
    if (!code) return;
    
    switch (code) {
      // Movement keys
      case 'KeyW':
        keys.forward = isDown;
        break;
      case 'KeyS':
        keys.backward = isDown;
        break;
      case 'KeyA':
        keys.left = isDown;
        break;
      case 'KeyD':
        keys.right = isDown;
        break;
      
      // Action keys
      case 'Space':
        keys.up = isDown;
        break;
      case 'KeyX':
        keys.down = isDown;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.sprint = isDown;
        break;
      case 'KeyQ':
        keys.q = isDown;
        break;
      case 'KeyE':
        keys.e = isDown;
        break;
      case 'KeyR':
        keys.fire = isDown;
        break;
      
      // Mode keys
      case 'KeyB':
        keys.toggleMode = isDown;
        break;
      case 'F5':
        keys.toggleCamera = isDown;
        break;
      
      // Inventory keys - only update these in player mode
      // The mode check is done in the handlers that use these keys
      case 'Digit1':
        keys.slot1 = isDown;
        break;
      case 'Digit2':
        keys.slot2 = isDown;
        break;
      case 'Digit3':
        keys.slot3 = isDown;
        break;
      case 'Digit4':
        keys.slot4 = isDown;
        break;
      case 'Digit5':
        keys.slot5 = isDown;
        break;
      case 'Digit6':
        keys.slot6 = isDown;
        break;
      case 'Digit7':
        keys.slot7 = isDown;
        break;
      case 'Digit8':
        keys.slot8 = isDown;
        break;
      case 'Digit9':
        keys.slot9 = isDown;
        break;
      
      // UI keys
      case 'KeyI':
        keys.inventory = isDown;
        break;
      case 'KeyM':
        keys.map = isDown;
        break;
      case 'KeyT':
        keys.chat = isDown;
        break;
      case 'Escape':
        keys.escape = isDown;
        break;
    }
  }
  
  /**
   * Check if a key code is a game control
   * @param {string} code - The key code
   * @returns {boolean} Whether the key is a game control
   */
  function isGameControl(code) {
    if (!code) return false;
    
    return [
      'KeyW', 'KeyS', 'KeyA', 'KeyD',
      'Space', 'KeyX', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyF', 'F5',
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
      'Digit6', 'Digit7', 'Digit8', 'Digit9',
      'Tab'
    ].includes(code);
  }
  
  /**
   * Handle mouse move events
   * ponytail: with pointer lock, browsers dispatch mousemove on document — not the canvas.
   * @param {MouseEvent} event - The mouse event
   */
  function handleMouseMove(event) {
    const locked = !pointerLockTarget || document.pointerLockElement === pointerLockTarget;
    const shipDragLook = window.gameState?.mode === 'ship' && event.buttons > 0;

    if (!locked && !shipDragLook) {
      return;
    }

    const deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const deltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    onMouseMove(deltaX, deltaY);
  }
  
  /**
   * Handle mouse down events
   * @param {MouseEvent} event - The mouse event
   */
  function handleMouseDown(event) {
    switch (event.button) {
      case 0:
        mouse.leftButton = true;
        break;
      case 1:
        mouse.middleButton = true;
        break;
      case 2:
        mouse.rightButton = true;
        break;
    }
    
    onMouseDown(event);
  }
  
  /**
   * Handle mouse up events
   * @param {MouseEvent} event - The mouse event
   */
  function handleMouseUp(event) {
    switch (event.button) {
      case 0:
        mouse.leftButton = false;
        break;
      case 1:
        mouse.middleButton = false;
        break;
      case 2:
        mouse.rightButton = false;
        break;
    }
    
    onMouseUp(event);
  }
  
  /**
   * Handle mouse wheel events
   * @param {WheelEvent} event - The wheel event
   */
  function handleMouseWheel(event) {
    if (pointerLockTarget) {
      event.preventDefault();
    }
    onMouseWheel(event.deltaY, event.deltaX, { ctrlKey: event.ctrlKey });
  }

  function unbindPointerListeners() {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('wheel', handleMouseWheel);
    if (interactionElement) {
      interactionElement.removeEventListener('mousedown', handleMouseDown);
      interactionElement.removeEventListener('mouseup', handleMouseUp);
      interactionElement.removeEventListener('contextmenu', preventContextMenu);
    }
  }

  function bindPointerListeners(newInteractionElement, lockTarget) {
    unbindPointerListeners();
    interactionElement = newInteractionElement;
    pointerLockTarget = lockTarget;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('wheel', handleMouseWheel, { passive: false });
    interactionElement.addEventListener('mousedown', handleMouseDown);
    interactionElement.addEventListener('mouseup', handleMouseUp);
    interactionElement.addEventListener('contextmenu', preventContextMenu);
  }

  function preventContextMenu(e) {
    e.preventDefault();
  }

  /**
   * Re-bind mouse listeners to the game canvas (and pointer-lock target).
   * @param {HTMLElement} newElement
   * @param {HTMLElement} [lockTarget]
   */
  function bindElement(newElement, lockTarget = newElement) {
    bindPointerListeners(newElement, lockTarget);
  }

  /**
   * Destroy the input handler
   */
  function destroy() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    unbindPointerListeners();
  }
  
  // Initialize
  init();
  
  return {
    keys,
    mouse,
    destroy,
    bindElement,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onMouseWheel
  };
}
