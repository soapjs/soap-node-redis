// Polyfill for crypto in Node.js environment
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

// Integration test setup - uses shared Redis container
const setupIntegrationTests = async (): Promise<string> => {
  // Get Redis URL from environment variable (set by the test runner script)
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set. Please run tests using the integration test script.');
  }
  
  console.log(`Using Redis URL: ${redisUrl}`);
  return redisUrl;
};

const teardownIntegrationTests = async (): Promise<void> => {
  // No teardown needed - container is managed by the test runner script
  console.log('Test completed, container will be managed by test runner');
};

// Export setup and teardown functions for use in individual tests
export { setupIntegrationTests, teardownIntegrationTests };
