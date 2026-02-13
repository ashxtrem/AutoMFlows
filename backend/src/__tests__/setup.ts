// Jest test setup file
// This file runs before all tests

// Set test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests (optional)
// Uncomment if needed:
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
