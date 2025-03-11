/**
 * Jest setup file
 * 
 * This file runs before each test file.
 */

// Mock the document object
global.document = {
  createElement: jest.fn(() => ({
    style: {},
    appendChild: jest.fn(),
    addEventListener: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  addEventListener: jest.fn(),
  getElementById: jest.fn(() => ({
    style: {},
    querySelectorAll: jest.fn(() => []),
    appendChild: jest.fn()
  }))
};

// Mock the window object
global.window = {
  addEventListener: jest.fn(),
  innerWidth: 1024,
  innerHeight: 768
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));

// Mock performance.now
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock alert
global.alert = jest.fn();

// Mock fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  })
); 