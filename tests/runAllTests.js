/**
 * Master test runner for Airship Skirmish
 * 
 * This file imports and runs all test files in the project.
 * Run this file to execute all tests at once.
 */

// Import all test files
import './unit/physics/shipPhysics.test.js';
import './unit/modes/shipMode.test.js';
import './unit/modes/playerMode.test.js';
import './unit/input/inputHandler.test.js';

console.log('Running all tests...');

// The tests will be executed automatically by the test runner
// No additional code needed here 