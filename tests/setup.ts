/**
 * Test Setup
 * Runs before all tests
 */

import { beforeAll, afterAll } from 'bun:test';
import { redis } from '@/lib/redis';

beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Initialize Redis for tests
  await redis.initialize();
  
  // Clear test data
  const testKeys = await redis.keys('test:*');
  if (testKeys.length > 0) {
    await redis.del(...testKeys);
  }
  
  console.log('✅ Test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clear test data
  const testKeys = await redis.keys('test:*');
  if (testKeys.length > 0) {
    await redis.del(...testKeys);
  }
  
  // Close Redis connection
  await redis.quit();
  
  console.log('✅ Test environment cleaned');
});
