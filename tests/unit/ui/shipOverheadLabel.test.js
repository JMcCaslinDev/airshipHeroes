import { paintShipOverheadLabel } from '../../../src/ui/shipOverheadLabel.js';

describe('shipOverheadLabel', () => {
  test('paintShipOverheadLabel draws name and single lift bar', () => {
    const fills = [];
    const canvas = {
      getContext: () => ({
        clearRect: () => {},
        fillRect: (...args) => fills.push(args),
        fillText: () => {},
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: ''
      })
    };

    paintShipOverheadLabel(canvas, {
      name: 'Sky Reaver',
      liftRatio: 0.2
    });

    // Name strip + lift track + lift fill (no second health bar)
    expect(fills.length).toBe(3);
  });
});
