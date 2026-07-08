/**
 * Input handler only applies look deltas while pointer is locked on the canvas.
 */

import { createInputHandler } from '../../../src/input/inputHandler.js';

describe('inputHandler pointer lock', () => {
  afterEach(() => {
    Object.defineProperty(document, 'pointerLockElement', {
      configurable: true,
      writable: true,
      value: null
    });
  });

  test('ignores mousemove when pointer is not locked on target', () => {
    const onMouseMove = jest.fn();
    const canvas = document.createElement('canvas');
    createInputHandler({
      element: canvas,
      pointerLockTarget: canvas,
      onMouseMove
    });

    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      movementX: 10,
      movementY: 5
    }));

    expect(onMouseMove).not.toHaveBeenCalled();
  });

  test('applies mousemove on document when pointer is locked on canvas', () => {
    const onMouseMove = jest.fn();
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    Object.defineProperty(document, 'pointerLockElement', {
      configurable: true,
      writable: true,
      value: canvas
    });

    createInputHandler({
      element: canvas,
      pointerLockTarget: canvas,
      onMouseMove
    });

    const event = new MouseEvent('mousemove', { bubbles: true });
    Object.defineProperty(event, 'movementX', { value: 10 });
    Object.defineProperty(event, 'movementY', { value: 5 });
    document.dispatchEvent(event);

    expect(onMouseMove).toHaveBeenCalledWith(10, 5);
    canvas.remove();
  });
});
