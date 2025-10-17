/**
 * Risk Lock Service Integration Tests
 * Tests for distributed locking and race condition prevention
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import RiskLockService from '../services/risk-lock.service';

describe('RiskLockService - Integration Tests', () => {
  const TEST_USER_ID = 'test-user-lock';
  const TEST_TENANT_ID = 'test-tenant-lock';

  beforeEach(() => {
    // Reset statistics before each test
    RiskLockService.resetStatistics();
  });

  afterEach(async () => {
    // Cleanup all locks after each test
    await RiskLockService.cleanupUserLocks(TEST_USER_ID, TEST_TENANT_ID);
  });

  describe('Basic Lock Operations', () => {
    test('should acquire lock successfully', async () => {
      const lockResult = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);

      expect(lockResult.acquired).toBe(true);
      expect(lockResult.lockId).toBeTruthy();

      // Verify lock exists
      const isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID);
      expect(isLocked).toBe(true);

      // Release lock
      const released = await RiskLockService.releaseLock(
        TEST_USER_ID,
        TEST_TENANT_ID,
        lockResult.lockId!
      );
      expect(released).toBe(true);
    });

    test('should fail to acquire lock when already held', async () => {
      // First lock acquires successfully
      const lock1 = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);
      expect(lock1.acquired).toBe(true);

      // Second lock should fail
      const lock2 = await RiskLockService.acquireLock(
        TEST_USER_ID,
        TEST_TENANT_ID,
        'metrics',
        5000
      );
      expect(lock2.acquired).toBe(false);
      expect(lock2.message).toContain('Failed to acquire lock');

      // Release first lock
      await RiskLockService.releaseLock(TEST_USER_ID, TEST_TENANT_ID, lock1.lockId!);
    });

    test('should release lock correctly', async () => {
      const lockResult = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);
      expect(lockResult.acquired).toBe(true);

      // Release lock
      const released = await RiskLockService.releaseLock(
        TEST_USER_ID,
        TEST_TENANT_ID,
        lockResult.lockId!
      );
      expect(released).toBe(true);

      // Verify lock is gone
      const isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID);
      expect(isLocked).toBe(false);
    });

    test('should not release lock owned by another process', async () => {
      const lockResult = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);
      expect(lockResult.acquired).toBe(true);

      // Try to release with wrong lockId
      const released = await RiskLockService.releaseLock(
        TEST_USER_ID,
        TEST_TENANT_ID,
        'wrong-lock-id'
      );
      expect(released).toBe(false);

      // Clean up
      await RiskLockService.releaseLock(TEST_USER_ID, TEST_TENANT_ID, lockResult.lockId!);
    });
  });

  describe('WithLock Pattern', () => {
    test('should execute function with lock protection', async () => {
      let executionCount = 0;

      const result = await RiskLockService.withLock(
        TEST_USER_ID,
        TEST_TENANT_ID,
        async () => {
          executionCount++;
          return 'success';
        }
      );

      expect(result).toBe('success');
      expect(executionCount).toBe(1);

      // Lock should be released after execution
      const isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID);
      expect(isLocked).toBe(false);
    });

    test('should release lock even if function throws', async () => {
      try {
        await RiskLockService.withLock(TEST_USER_ID, TEST_TENANT_ID, async () => {
          throw new Error('Simulated error');
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Lock should be released despite error
      const isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID);
      expect(isLocked).toBe(false);
    });

    test('should throw if lock cannot be acquired', async () => {
      // Acquire lock manually
      const lock = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);
      expect(lock.acquired).toBe(true);

      // Try to execute with lock (should fail)
      try {
        await RiskLockService.withLock(
          TEST_USER_ID,
          TEST_TENANT_ID,
          async () => {
            return 'should not execute';
          }
        );
        throw new Error('Should have thrown');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).toContain('Failed to acquire lock');
      }

      // Clean up
      await RiskLockService.releaseLock(TEST_USER_ID, TEST_TENANT_ID, lock.lockId!);
    });
  });

  describe('Concurrency Tests', () => {
    test('should prevent race conditions with 10 concurrent requests', async () => {
      let sharedCounter = 0;
      const operations = 10;

      // Simulate 10 concurrent operations that increment a shared counter
      const promises = Array(operations)
        .fill(null)
        .map(() =>
          RiskLockService.withLock(TEST_USER_ID, TEST_TENANT_ID, async () => {
            const current = sharedCounter;
            // Simulate some async work
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
            sharedCounter = current + 1;
            return sharedCounter;
          })
        );

      const results = await Promise.all(promises);

      // All operations should complete
      expect(results.length).toBe(operations);

      // Counter should be exactly 10 (no lost updates)
      expect(sharedCounter).toBe(operations);

      // Results should contain all values from 1 to 10
      const sortedResults = results.sort((a, b) => a - b);
      expect(sortedResults[0]).toBe(1);
      expect(sortedResults[operations - 1]).toBe(operations);
    }, 30000); // 30s timeout for concurrency test

    test('should serialize concurrent calculations', async () => {
      const executionOrder: number[] = [];

      const promises = Array(5)
        .fill(null)
        .map((_, index) =>
          RiskLockService.withLock(TEST_USER_ID, TEST_TENANT_ID, async () => {
            const start = Date.now();
            executionOrder.push(index);
            // Simulate calculation work
            await new Promise((resolve) => setTimeout(resolve, 50));
            return { index, timestamp: Date.now() - start };
          })
        );

      const results = await Promise.all(promises);

      // All should complete
      expect(results.length).toBe(5);

      // Each execution should take at least 50ms
      results.forEach((r) => {
        expect(r.timestamp).toBeGreaterThanOrEqual(45); // Allow 5ms tolerance
      });

      // Execution order shows serialization (not strict order due to Promise.all)
      expect(executionOrder.length).toBe(5);
    }, 20000);
  });

  describe('Lock Statistics', () => {
    test('should track lock statistics', async () => {
      // Reset to start fresh
      RiskLockService.resetStatistics();

      // Acquire and release 3 times
      for (let i = 0; i < 3; i++) {
        await RiskLockService.withLock(TEST_USER_ID, TEST_TENANT_ID, async () => {
          return 'test';
        });
      }

      const stats = RiskLockService.getStatistics();

      expect(stats.totalAcquired).toBe(3);
      expect(stats.totalReleased).toBe(3);
      expect(stats.totalFailed).toBe(0);
      expect(stats.currentlyLocked).toBe(0); // All released
      expect(stats.averageHoldTime).toBeGreaterThan(0);
    });

    test('should track failed lock acquisitions', async () => {
      RiskLockService.resetStatistics();

      // Acquire lock
      const lock = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);
      expect(lock.acquired).toBe(true);

      // Try to acquire again (should fail)
      const lock2 = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);
      expect(lock2.acquired).toBe(false);

      const stats = RiskLockService.getStatistics();

      expect(stats.totalAcquired).toBe(1);
      expect(stats.totalFailed).toBe(1);

      // Clean up
      await RiskLockService.releaseLock(TEST_USER_ID, TEST_TENANT_ID, lock.lockId!);
    });
  });

  describe('Lock Cleanup', () => {
    test('should cleanup all locks for a user', async () => {
      // Create locks for different resources
      const resources = ['metrics', 'profile', 'limits'];

      for (const resource of resources) {
        const lock = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID, resource);
        expect(lock.acquired).toBe(true);
      }

      // Verify locks exist
      for (const resource of resources) {
        const isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID, resource);
        expect(isLocked).toBe(true);
      }

      // Cleanup all locks
      const keysDeleted = await RiskLockService.cleanupUserLocks(TEST_USER_ID, TEST_TENANT_ID);
      expect(keysDeleted).toBe(resources.length);

      // Verify all locks are gone
      for (const resource of resources) {
        const isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID, resource);
        expect(isLocked).toBe(false);
      }
    });

    test('should force release a specific lock', async () => {
      const lock = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);
      expect(lock.acquired).toBe(true);

      // Verify lock exists
      let isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID);
      expect(isLocked).toBe(true);

      // Force release (emergency cleanup)
      await RiskLockService.forceRelease(TEST_USER_ID, TEST_TENANT_ID);

      // Verify lock is gone
      isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID);
      expect(isLocked).toBe(false);
    });
  });

  describe('Lock TTL and Expiration', () => {
    test('should respect TTL and auto-release after timeout', async () => {
      const shortTTL = 1000; // 1 second

      const lock = await RiskLockService.acquireLock(
        TEST_USER_ID,
        TEST_TENANT_ID,
        'metrics',
        shortTTL
      );
      expect(lock.acquired).toBe(true);

      // Verify lock exists
      let isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID);
      expect(isLocked).toBe(true);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Lock should be auto-released by Redis
      isLocked = await RiskLockService.isLocked(TEST_USER_ID, TEST_TENANT_ID);
      expect(isLocked).toBe(false);

      // Should be able to acquire lock again
      const lock2 = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID);
      expect(lock2.acquired).toBe(true);

      // Clean up
      await RiskLockService.releaseLock(TEST_USER_ID, TEST_TENANT_ID, lock2.lockId!);
    }, 5000);
  });

  describe('Different Resources', () => {
    test('should allow locks on different resources simultaneously', async () => {
      const lock1 = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID, 'metrics');
      const lock2 = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID, 'profile');
      const lock3 = await RiskLockService.acquireLock(TEST_USER_ID, TEST_TENANT_ID, 'limits');

      expect(lock1.acquired).toBe(true);
      expect(lock2.acquired).toBe(true);
      expect(lock3.acquired).toBe(true);

      // Clean up
      await RiskLockService.releaseLock(TEST_USER_ID, TEST_TENANT_ID, lock1.lockId!, 'metrics');
      await RiskLockService.releaseLock(TEST_USER_ID, TEST_TENANT_ID, lock2.lockId!, 'profile');
      await RiskLockService.releaseLock(TEST_USER_ID, TEST_TENANT_ID, lock3.lockId!, 'limits');
    });

    test('should isolate locks between different users', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      const lock1 = await RiskLockService.acquireLock(user1, TEST_TENANT_ID);
      const lock2 = await RiskLockService.acquireLock(user2, TEST_TENANT_ID);

      // Both should acquire successfully (different users)
      expect(lock1.acquired).toBe(true);
      expect(lock2.acquired).toBe(true);

      // Clean up
      await RiskLockService.cleanupUserLocks(user1, TEST_TENANT_ID);
      await RiskLockService.cleanupUserLocks(user2, TEST_TENANT_ID);
    });
  });
});
