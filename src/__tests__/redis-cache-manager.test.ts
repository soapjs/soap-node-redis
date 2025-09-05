import { RedisCacheManager } from '../redis-cache-manager';
import { CacheOptions } from '@soapjs/soap';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  ping: jest.fn(),
  disconnect: jest.fn()
};

// Mock the Redis client type
jest.mock('../redis.types', () => ({
  RedisClientType: jest.fn()
}));

describe('RedisCacheManager Unit Tests', () => {
  let cacheManager: RedisCacheManager;
  let mockOptions: CacheOptions;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default options
    mockOptions = {
      ttl: 3600,
      prefix: 'test-cache',
      enabled: true
    };

    // Create new cache manager instance
    cacheManager = new RedisCacheManager(mockRedisClient as any, mockOptions);
  });

  describe('Constructor and Options', () => {
    it('should initialize with provided options', () => {
      expect(cacheManager.options).toEqual(mockOptions);
      expect(cacheManager.isEnabled()).toBe(true);
    });

    it('should handle disabled cache', () => {
      const disabledOptions: CacheOptions = {
        ttl: 3600,
        enabled: false
      };
      
      const disabledCache = new RedisCacheManager(mockRedisClient as any, disabledOptions);
      expect(disabledCache.isEnabled()).toBe(false);
    });

    it('should handle options without prefix', () => {
      const optionsWithoutPrefix: CacheOptions = {
        ttl: 1800,
        enabled: true
      };
      
      const cache = new RedisCacheManager(mockRedisClient as any, optionsWithoutPrefix);
      expect(cache.options.prefix).toBeUndefined();
    });

    it('should handle options with undefined enabled', () => {
      const optionsWithUndefinedEnabled: CacheOptions = {
        ttl: 1800,
        prefix: 'test'
        // enabled is undefined, should default to true
      };
      
      const cache = new RedisCacheManager(mockRedisClient as any, optionsWithUndefinedEnabled);
      expect(cache.isEnabled()).toBe(true);
    });
  });

  describe('get() method', () => {
    it('should return null when cache is disabled', async () => {
      const disabledCache = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: false });
      
      const result = await disabledCache.get('test-key');
      
      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await cacheManager.get('non-existent-key');
      
      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-cache:non-existent-key');
    });

    it('should return parsed value when key exists', async () => {
      const testValue = { name: 'John', age: 30 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testValue));
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toEqual(testValue);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-cache:test-key');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'));
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBeNull();
    });

    it('should work without prefix', async () => {
      const cacheWithoutPrefix = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: true });
      mockRedisClient.get.mockResolvedValue('"test-value"');
      
      const result = await cacheWithoutPrefix.get('test-key');
      
      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });
  });

  describe('set() method', () => {
    it('should not set value when cache is disabled', async () => {
      const disabledCache = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: false });
      
      await disabledCache.set('test-key', 'test-value');
      
      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should set value with default TTL using setEx', async () => {
      const testValue = { name: 'John', age: 30 };
      
      await cacheManager.set('test-key', testValue);
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-cache:test-key',
        3600,
        JSON.stringify(testValue)
      );
    });

    it('should set value with custom TTL using setEx', async () => {
      const testValue = 'test-value';
      const customTtl = 1800;
      
      await cacheManager.set('test-key', testValue, customTtl);
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-cache:test-key',
        customTtl,
        JSON.stringify(testValue)
      );
    });

    it('should set value without expiration when TTL is 0', async () => {
      const testValue = 'test-value';
      
      await cacheManager.set('test-key', testValue, 0);
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-cache:test-key',
        JSON.stringify(testValue)
      );
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should handle JSON serialization errors gracefully', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      await cacheManager.set('test-key', circularObj);
      
      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));
      
      await cacheManager.set('test-key', 'test-value');
      
      // Should not throw, just log error
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should work without prefix', async () => {
      const cacheWithoutPrefix = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: true });
      
      await cacheWithoutPrefix.set('test-key', 'test-value');
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, '"test-value"');
    });
  });

  describe('delete() method', () => {
    it('should not delete when cache is disabled', async () => {
      const disabledCache = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: false });
      
      await disabledCache.delete('test-key');
      
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should delete key when cache is enabled', async () => {
      await cacheManager.delete('test-key');
      
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-cache:test-key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
      
      await cacheManager.delete('test-key');
      
      // Should not throw, just log error
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should work without prefix', async () => {
      const cacheWithoutPrefix = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: true });
      
      await cacheWithoutPrefix.delete('test-key');
      
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('clear() method', () => {
    it('should not clear when cache is disabled', async () => {
      const disabledCache = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: false });
      
      await disabledCache.clear();
      
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should clear all keys with prefix when no prefix provided', async () => {
      mockRedisClient.keys.mockResolvedValue(['test-cache:key1', 'test-cache:key2']);
      
      await cacheManager.clear();
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('test-cache:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['test-cache:key1', 'test-cache:key2']);
    });

    it('should clear keys with custom prefix', async () => {
      mockRedisClient.keys.mockResolvedValue(['custom:key1', 'custom:key2']);
      
      await cacheManager.clear('custom');
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('custom:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['custom:key1', 'custom:key2']);
    });

    it('should handle empty keys array', async () => {
      mockRedisClient.keys.mockResolvedValue([]);
      
      await cacheManager.clear();
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('test-cache:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));
      
      await cacheManager.clear();
      
      // Should not throw, just log error
      expect(mockRedisClient.keys).toHaveBeenCalled();
    });

    it('should work without prefix', async () => {
      const cacheWithoutPrefix = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: true });
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2']);
      
      await cacheWithoutPrefix.clear();
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['key1', 'key2']);
    });
  });

  describe('generateKey() method', () => {
    it('should generate consistent keys for same operation and query', () => {
      const operation = 'find';
      const query = { where: { id: 1 } };
      
      const key1 = cacheManager.generateKey(operation, query);
      const key2 = cacheManager.generateKey(operation, query);
      
      expect(key1).toBe(key2);
      expect(key1).toContain(operation);
    });

    it('should generate different keys for different operations', () => {
      const query = { where: { id: 1 } };
      
      const findKey = cacheManager.generateKey('find', query);
      const countKey = cacheManager.generateKey('count', query);
      
      expect(findKey).not.toBe(countKey);
      expect(findKey).toContain('find');
      expect(countKey).toContain('count');
    });

    it('should generate different keys for different queries', () => {
      const operation = 'find';
      const query1 = { where: { id: 1 } };
      const query2 = { where: { id: 2 } };
      
      const key1 = cacheManager.generateKey(operation, query1);
      const key2 = cacheManager.generateKey(operation, query2);
      
      expect(key1).not.toBe(key2);
    });

    it('should handle complex query objects', () => {
      const operation = 'find';
      const query = {
        where: {
          status: 'active',
          age: { $gte: 18, $lte: 65 }
        },
        orderBy: { createdAt: 'desc' },
        limit: 20,
        offset: 0
      };
      
      const key = cacheManager.generateKey(operation, query);
      
      expect(key).toContain(operation);
      expect(key.length).toBeGreaterThan(operation.length);
    });

    it('should handle null and undefined queries', () => {
      const operation = 'find';
      
      const nullKey = cacheManager.generateKey(operation, null);
      const undefinedKey = cacheManager.generateKey(operation, undefined);
      const emptyKey = cacheManager.generateKey(operation, {});
      
      expect(nullKey).toContain(operation);
      expect(undefinedKey).toContain(operation);
      expect(emptyKey).toContain(operation);
      expect(nullKey).toBe(undefinedKey); // Both should be treated the same
    });

    it('should handle empty objects', () => {
      const operation = 'find';
      const query = {};
      
      const key = cacheManager.generateKey(operation, query);
      
      expect(key).toContain(operation);
      expect(key).toBe(`${operation}:${Buffer.from('{}').toString('base64')}`);
    });

    it('should generate base64 encoded query strings', () => {
      const operation = 'find';
      const query = { where: { id: 1 } };
      
      const key = cacheManager.generateKey(operation, query);
      const expectedQueryString = JSON.stringify(query);
      const expectedEncoded = Buffer.from(expectedQueryString).toString('base64');
      
      expect(key).toBe(`${operation}:${expectedEncoded}`);
    });
  });

  describe('isEnabled() method', () => {
    it('should return true when enabled', () => {
      expect(cacheManager.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const disabledCache = new RedisCacheManager(mockRedisClient as any, { ttl: 3600, enabled: false });
      expect(disabledCache.isEnabled()).toBe(false);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle very large values', async () => {
      const largeValue = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          content: `Item ${i}`.repeat(100)
        }))
      };
      
      await cacheManager.set('large-key', largeValue);
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-cache:large-key',
        3600,
        JSON.stringify(largeValue)
      );
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key:with:special:chars!@#$%^&*()';
      
      await cacheManager.set(specialKey, 'value');
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `test-cache:${specialKey}`,
        3600,
        '"value"'
      );
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);
      
      await cacheManager.set(longKey, 'value');
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `test-cache:${longKey}`,
        3600,
        '"value"'
      );
    });

    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => 
        cacheManager.set(`key-${i}`, `value-${i}`)
      );
      
      await Promise.all(operations);
      
      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(100);
    });

    it('should handle mixed data types', async () => {
      const testCases = [
        { key: 'string', value: 'hello' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'null', value: null },
        { key: 'array', value: [1, 2, 3] },
        { key: 'object', value: { nested: true } }
      ];
      
      for (const testCase of testCases) {
        await cacheManager.set(testCase.key, testCase.value);
      }
      
      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(testCases.length);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid successive operations', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await cacheManager.set(`key-${i}`, `value-${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(100);
    });

    it('should not leak memory with repeated operations', async () => {
      // This test ensures that repeated operations don't cause memory leaks
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 100; i++) {
        await cacheManager.set(`key-${i}`, `value-${i}`);
        await cacheManager.get(`key-${i}`);
        await cacheManager.delete(`key-${i}`);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
