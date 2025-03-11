/**
 * Unit tests for the input handler
 */

import { createInputHandler } from '../../../src/input/inputHandler.js';

describe('Input Handler', () => {
  // Mock element for event listeners
  let mockElement;
  let inputHandler;
  
  // Mock callbacks
  const mockMouseMove = jest.fn();
  const mockMouseDown = jest.fn();
  const mockMouseUp = jest.fn();
  const mockMouseWheel = jest.fn();
  
  beforeEach(() => {
    // Create a mock element with addEventListener and removeEventListener methods
    mockElement = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // Create a spy on window event listeners
    jest.spyOn(window, 'addEventListener');
    jest.spyOn(window, 'removeEventListener');
    
    // Create the input handler with our mock element
    inputHandler = createInputHandler({
      element: mockElement,
      onMouseMove: mockMouseMove,
      onMouseDown: mockMouseDown,
      onMouseUp: mockMouseUp,
      onMouseWheel: mockMouseWheel
    });
  });
  
  afterEach(() => {
    // Clean up
    window.addEventListener.mockRestore();
    window.removeEventListener.mockRestore();
    jest.clearAllMocks();
  });
  
  test('should initialize with default key states', () => {
    // Check that keys are initialized to false
    expect(inputHandler.keys.forward).toBe(false);
    expect(inputHandler.keys.backward).toBe(false);
    expect(inputHandler.keys.left).toBe(false);
    expect(inputHandler.keys.right).toBe(false);
    expect(inputHandler.keys.up).toBe(false);
    expect(inputHandler.keys.down).toBe(false);
    
    // Check that mouse is initialized
    expect(inputHandler.mouse.leftButton).toBe(false);
    expect(inputHandler.mouse.rightButton).toBe(false);
    expect(inputHandler.mouse.middleButton).toBe(false);
  });
  
  test('should add event listeners on initialization', () => {
    // Check that event listeners were added to window
    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    
    // Check that event listeners were added to the element
    expect(mockElement.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(mockElement.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(mockElement.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockElement.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(mockElement.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
  });
  
  test('should remove event listeners on destroy', () => {
    // Destroy the input handler
    inputHandler.destroy();
    
    // Check that event listeners were removed from window
    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    
    // Check that event listeners were removed from the element
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
  });
  
  test('should update key states on keydown and keyup events', () => {
    // Get the keydown and keyup handlers
    const keydownHandler = window.addEventListener.mock.calls.find(call => call[0] === 'keydown')[1];
    const keyupHandler = window.addEventListener.mock.calls.find(call => call[0] === 'keyup')[1];
    
    // Test W key (forward)
    keydownHandler({ code: 'KeyW', preventDefault: jest.fn() });
    expect(inputHandler.keys.forward).toBe(true);
    
    keyupHandler({ code: 'KeyW' });
    expect(inputHandler.keys.forward).toBe(false);
    
    // Test S key (backward)
    keydownHandler({ code: 'KeyS', preventDefault: jest.fn() });
    expect(inputHandler.keys.backward).toBe(true);
    
    keyupHandler({ code: 'KeyS' });
    expect(inputHandler.keys.backward).toBe(false);
    
    // Test Space key (up/jump)
    keydownHandler({ code: 'Space', preventDefault: jest.fn() });
    expect(inputHandler.keys.up).toBe(true);
    
    keyupHandler({ code: 'Space' });
    expect(inputHandler.keys.up).toBe(false);
  });
  
  test('should handle mouse events correctly', () => {
    // Get the mouse event handlers
    const mousemoveHandler = mockElement.addEventListener.mock.calls.find(call => call[0] === 'mousemove')[1];
    const mousedownHandler = mockElement.addEventListener.mock.calls.find(call => call[0] === 'mousedown')[1];
    const mouseupHandler = mockElement.addEventListener.mock.calls.find(call => call[0] === 'mouseup')[1];
    const wheelHandler = mockElement.addEventListener.mock.calls.find(call => call[0] === 'wheel')[1];
    
    // Test mouse move
    const moveEvent = { 
      clientX: 100, 
      clientY: 200, 
      movementX: 10, 
      movementY: 20 
    };
    mousemoveHandler(moveEvent);
    expect(inputHandler.mouse.x).toBe(100);
    expect(inputHandler.mouse.y).toBe(200);
    expect(mockMouseMove).toHaveBeenCalledWith(10, 20);
    
    // Test left mouse button down
    mousedownHandler({ button: 0 });
    expect(inputHandler.mouse.leftButton).toBe(true);
    expect(mockMouseDown).toHaveBeenCalled();
    
    // Test left mouse button up
    mouseupHandler({ button: 0 });
    expect(inputHandler.mouse.leftButton).toBe(false);
    expect(mockMouseUp).toHaveBeenCalled();
    
    // Test right mouse button down
    mousedownHandler({ button: 2 });
    expect(inputHandler.mouse.rightButton).toBe(true);
    
    // Test right mouse button up
    mouseupHandler({ button: 2 });
    expect(inputHandler.mouse.rightButton).toBe(false);
    
    // Test mouse wheel
    wheelHandler({ deltaY: 100 });
    expect(mockMouseWheel).toHaveBeenCalledWith(100);
  });
  
  test('should prevent default for game controls', () => {
    // Get the keydown handler
    const keydownHandler = window.addEventListener.mock.calls.find(call => call[0] === 'keydown')[1];
    
    // Test game control key (should prevent default)
    const preventDefaultMock = jest.fn();
    keydownHandler({ code: 'KeyW', preventDefault: preventDefaultMock });
    expect(preventDefaultMock).toHaveBeenCalled();
    
    // Test non-game control key (should not prevent default)
    const preventDefaultMock2 = jest.fn();
    keydownHandler({ code: 'KeyP', preventDefault: preventDefaultMock2 });
    expect(preventDefaultMock2).not.toHaveBeenCalled();
  });
}); 