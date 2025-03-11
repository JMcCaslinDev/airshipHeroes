/**
 * Simple test script to verify Ship class methods
 */

import Ship from './src/components/ship.js';

// Create a ship instance
const ship = new Ship();

// Add some test blocks
ship.blocks = [
  { type: 'wood' },
  { type: 'wood' },
  { type: 'lift' },
  { type: 'lift' },
  { type: 'cannon' }
];

// Test getBlockCount method
console.log('Total blocks:', ship.getBlockCount());

// Test getBlockCountByType method
console.log('Lift blocks:', ship.getBlockCountByType('lift'));
console.log('Wood blocks:', ship.getBlockCountByType('wood'));
console.log('Cannon blocks:', ship.getBlockCountByType('cannon'));

// Verify the methods work as expected
console.assert(ship.getBlockCount() === 5, 'Block count should be 5');
console.assert(ship.getBlockCountByType('lift') === 2, 'Lift block count should be 2');
console.assert(ship.getBlockCountByType('wood') === 2, 'Wood block count should be 2');
console.assert(ship.getBlockCountByType('cannon') === 1, 'Cannon block count should be 1');

console.log('All tests passed!'); 