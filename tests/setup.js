/**
 * Jest setup file
 * 
 * This file runs before each test file.
 */

// Create mock functions
const mockFn = () => {
  const fn = function(...args) {
    fn.mock.calls.push(args);
    return fn.mock.returnValue;
  };
  fn.mock = {
    calls: [],
    instances: [],
    returnValue: undefined
  };
  fn.mockReturnValue = function(val) {
    fn.mock.returnValue = val;
    return fn;
  };
  fn.mockImplementation = function(impl) {
    fn.implementation = impl;
    return fn;
  };
  fn.mockReturnThis = function() {
    return fn.mockImplementation(function() {
      return this;
    });
  };
  return fn;
};

// Mock the document object
global.document = {
  createElement: mockFn().mockReturnValue({
    style: {},
    appendChild: mockFn(),
    addEventListener: mockFn()
  }),
  body: {
    appendChild: mockFn(),
    removeChild: mockFn()
  },
  addEventListener: mockFn(),
  getElementById: mockFn().mockReturnValue({
    style: {},
    querySelectorAll: mockFn().mockReturnValue([]),
    appendChild: mockFn()
  })
};

// Mock the window object
global.window = {
  addEventListener: mockFn(),
  innerWidth: 1024,
  innerHeight: 768
};

// Mock requestAnimationFrame
global.requestAnimationFrame = mockFn(callback => setTimeout(callback, 0));

// Mock performance.now
global.performance = {
  now: mockFn(() => Date.now())
};

// Mock alert
global.alert = mockFn();

// Mock fetch
global.fetch = mockFn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  })
); 