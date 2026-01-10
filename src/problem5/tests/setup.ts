/**
 * Jest Setup File
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // Suppress logs during tests

// Increase timeout for async operations
jest.setTimeout(10000);

// Global teardown
afterAll(async () => {
  // Add any global cleanup here
});

