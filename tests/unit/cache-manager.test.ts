/**
 * CacheManager Unit Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { cacheManager } from '../../src/cache';

describe('CacheManager', () => {
  const testNamespace = 'test';

  beforeEach(async () => {
    await cacheManager.clearNamespace(testNamespace);
  });

  describe('Basic Operations', () => {
    test('should set and get a value', async () => {
      const key = 'user:1';
      const value = { id: 1, name: 'Test User' };

      await cacheManager.set(key, value, { namespace: testNamespace });
      const result = await cacheManager.get(key, { namespace: testNamespace });

      expect(result).toEqual(value);
    });

    test('should return null for non-existent key', async () => {
      const result = await cacheManager.get('non-existent', { namespace: testNamespace });
      expect(result).toBeNull();
    });

    test('should delete a key', async () => {
      const key = 'user:2';
      await cacheManager.set(key, { id: 2 }, { namespace: testNamespace });

      const deleted = await cacheManager.delete(key, { namespace: testNamespace });
      expect(deleted).toBe(true);

      const result = await cacheManager.get(key, { namespace: testNamespace });
      expect(result).toBeNull();
    });
  });

  describe('Namespace Operations', () => {
    test('should clear entire namespace', async () => {
      await cacheManager.set('key1', 'value1', { namespace: testNamespace });
      await cacheManager.set('key2', 'value2', { namespace: testNamespace });
      await cacheManager.set('key3', 'value3', { namespace: testNamespace });

      const cleared = await cacheManager.clearNamespace(testNamespace);
      expect(cleared).toBe(3);

      const result1 = await cacheManager.get('key1', { namespace: testNamespace });
      expect(result1).toBeNull();
    });

    test('should isolate different namespaces', async () => {
      await cacheManager.set('key', 'value1', { namespace: 'ns1' });
      await cacheManager.set('key', 'value2', { namespace: 'ns2' });

      const result1 = await cacheManager.get('key', { namespace: 'ns1' });
      const result2 = await cacheManager.get('key', { namespace: 'ns2' });

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');

      await cacheManager.clearNamespace('ns1');
      await cacheManager.clearNamespace('ns2');
    });
  });

  describe('getOrSet Pattern', () => {
    test('should fetch and cache on first call', async () => {
      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        return { data: 'fetched' };
      };

      const result1 = await cacheManager.getOrSet('lazy:1', fetchFn, { namespace: testNamespace });
      expect(result1).toEqual({ data: 'fetched' });
      expect(fetchCount).toBe(1);

      const result2 = await cacheManager.getOrSet('lazy:1', fetchFn, { namespace: testNamespace });
      expect(result2).toEqual({ data: 'fetched' });
      expect(fetchCount).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should track cache hits', async () => {
      await cacheManager.set('stat:1', 'value', { namespace: testNamespace });
      await cacheManager.get('stat:1', { namespace: testNamespace });

      const stats = await cacheManager.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });
  });
});
