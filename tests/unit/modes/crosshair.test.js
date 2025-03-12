/**
 * Unit tests for crosshair functionality
 */

import { createCrosshair } from '../../../src/modes/playerMode.js';

// Mock document methods
document.createElement = jest.fn().mockImplementation((tag) => {
  const element = {
    style: {},
    className: '',
    id: '',
    appendChild: jest.fn(),
    querySelector: jest.fn().mockReturnValue(null),
    parentNode: {
      removeChild: jest.fn()
    }
  };
  return element;
});

document.getElementById = jest.fn().mockReturnValue(null);
document.body = {
  appendChild: jest.fn()
};

describe('Crosshair', () => {
  let crosshair;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create crosshair
    crosshair = createCrosshair();
  });
  
  test('should create a new crosshair element if it does not exist', () => {
    // Setup
    document.getElementById.mockReturnValue(null);
    
    // Execute
    crosshair = createCrosshair();
    
    // Verify
    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(document.body.appendChild).toHaveBeenCalled();
  });
  
  test('should use existing crosshair element if it exists', () => {
    // Setup
    const mockElement = {
      style: {},
      querySelector: jest.fn().mockReturnValue(true),
      appendChild: jest.fn()
    };
    document.getElementById.mockReturnValue(mockElement);
    
    // Execute
    crosshair = createCrosshair();
    
    // Verify
    expect(document.createElement).not.toHaveBeenCalledWith('div');
    expect(document.body.appendChild).not.toHaveBeenCalled();
  });
  
  test('should create vertical line elements with correct dimensions', () => {
    // Setup
    document.getElementById.mockReturnValue(null);
    
    // Execute
    crosshair = createCrosshair();
    
    // Verify - should create two vertical line elements
    expect(document.createElement).toHaveBeenCalledTimes(3); // Main div + 2 vertical lines
    
    // Check that the vertical lines were created with correct properties
    const calls = document.createElement.mock.calls;
    expect(calls[1][0]).toBe('div'); // First vertical line
    expect(calls[2][0]).toBe('div'); // Second vertical line
    
    // Get the created elements
    const mockElements = document.createElement.mock.results;
    const vTop = mockElements[1].value;
    const vBottom = mockElements[2].value;
    
    // Check dimensions for top vertical line
    expect(vTop.style.width).toBe('4px');
    expect(vTop.style.height).toBe('10px');
    expect(vTop.style.left).toBe('10.5px');
    
    // Check dimensions for bottom vertical line
    expect(vBottom.style.width).toBe('4px');
    expect(vBottom.style.height).toBe('10px');
    expect(vBottom.style.left).toBe('10.5px');
  });
  
  test('should show the crosshair', () => {
    // Setup
    const mockElement = { style: {} };
    crosshair.element = mockElement;
    
    // Execute
    crosshair.show();
    
    // Verify
    expect(mockElement.style.display).toBe('block');
  });
  
  test('should hide the crosshair', () => {
    // Setup
    const mockElement = { style: {} };
    crosshair.element = mockElement;
    
    // Execute
    crosshair.hide();
    
    // Verify
    expect(mockElement.style.display).toBe('none');
  });
  
  test('should update the crosshair based on mode', () => {
    // Setup
    const mockElement = { style: {} };
    crosshair.element = mockElement;
    crosshair.show = jest.fn();
    crosshair.hide = jest.fn();
    
    // Execute - player mode
    crosshair.update('player');
    
    // Verify
    expect(crosshair.show).toHaveBeenCalled();
    expect(crosshair.hide).not.toHaveBeenCalled();
    
    // Reset
    crosshair.show.mockClear();
    crosshair.hide.mockClear();
    
    // Execute - ship mode
    crosshair.update('ship');
    
    // Verify
    expect(crosshair.hide).toHaveBeenCalled();
    expect(crosshair.show).not.toHaveBeenCalled();
  });
  
  test('should destroy the crosshair', () => {
    // Setup
    const mockElement = {
      parentNode: {
        removeChild: jest.fn()
      }
    };
    crosshair.element = mockElement;
    
    // Execute
    crosshair.destroy();
    
    // Verify
    expect(mockElement.parentNode.removeChild).toHaveBeenCalledWith(mockElement);
  });
}); 