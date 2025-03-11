/**
 * Jest configuration for unit tests
 * @see https://jestjs.io/docs/configuration
 */

export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov'],
  verbose: true
}; 