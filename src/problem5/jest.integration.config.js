/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testTimeout: 60000, // Longer timeout for container startup
  maxWorkers: 1, // Run integration tests sequentially
};

