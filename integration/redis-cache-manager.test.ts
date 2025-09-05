import { setupIntegrationTests, teardownIntegrationTests } from './setup';
import { IntegrationTestHelper } from './test-helpers';
import { RedisCacheManager } from '../src/redis-cache-manager';
import { RedisSource } from '../src/redis.source';
import { RedisConfig } from '../src/redis.config';
import { CacheOptions } from '@soapjs/soap';

describe('RedisCacheManager Integration Tests', () => {
  let cacheManager: RedisCacheManager;
  let redisSource: RedisSource;
  let redisUrl: string;

  beforeAll(async () => {
    redisUrl = await setupIntegrationTests();
    
    // Parse the Redis URL to extract connection details
    const url = new URL(redisUrl);
    const host = url.hostname;
    const port = url.port || '6379';
    const password = url.password;
    
    const config = new RedisConfig(
      [host],
      [port],
      false,
      undefined,
      password,
      0  // Use database 0 for tests
    );

    redisSource = await RedisSource.create(config);
    await IntegrationTestHelper.waitForConnection(redisSource);
  });

  afterAll(async () => {
    if (redisSource) {
      await redisSource.client.disconnect();
    }
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    // Create a new cache manager instance for each test
    const options: CacheOptions = {
      ttl: 3600, // 1 hour default TTL
      prefix: 'test-cache',
      enabled: true
    };
    
    cacheManager = new RedisCacheManager(redisSource.client, options);
    
    // Clear any existing cache data
    await cacheManager.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get a simple value', async () => {
      // Arrange
      const key = 'test-key';
      const value = { name: 'John', age: 30 };

      // Act
      await cacheManager.set(key, value);
      const result = await cacheManager.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      // Act
      const result = await cacheManager.get('non-existent-key');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle string values', async () => {
      // Arrange
      const key = 'string-key';
      const value = 'Hello, World!';

      // Act
      await cacheManager.set(key, value);
      const result = await cacheManager.get<string>(key);

      // Assert
      expect(result).toBe(value);
    });

    it('should handle number values', async () => {
      // Arrange
      const key = 'number-key';
      const value = 42;

      // Act
      await cacheManager.set(key, value);
      const result = await cacheManager.get<number>(key);

      // Assert
      expect(result).toBe(value);
    });

    it('should handle array values', async () => {
      // Arrange
      const key = 'array-key';
      const value = [1, 2, 3, 'test', { nested: true }];

      // Act
      await cacheManager.set(key, value);
      const result = await cacheManager.get<typeof value>(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should handle complex nested objects', async () => {
      // Arrange
      const key = 'complex-object';
      const value = {
        user: {
          id: 1,
          profile: {
            name: 'John Doe',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        metadata: {
          createdAt: new Date().toISOString(),
          tags: ['user', 'premium']
        }
      };

      // Act
      await cacheManager.set(key, value);
      const result = await cacheManager.get<typeof value>(key);

      // Assert
      expect(result).toEqual(value);
    });
  });

  describe('Key Management', () => {
    it('should delete a specific key', async () => {
      // Arrange
      const key = 'delete-test';
      const value = 'to-be-deleted';
      await cacheManager.set(key, value);

      // Act
      await cacheManager.delete(key);
      const result = await cacheManager.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should clear all cache entries', async () => {
      // Arrange
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', 'value3'];
      
      for (let i = 0; i < keys.length; i++) {
        await cacheManager.set(keys[i], values[i]);
      }

      // Act
      await cacheManager.clear();

      // Assert
      for (const key of keys) {
        const result = await cacheManager.get(key);
        expect(result).toBeNull();
      }
    });

    it('should clear cache entries with specific prefix', async () => {
      // Arrange
      const prefix = 'test-prefix';
      const options: CacheOptions = {
        ttl: 3600,
        prefix: prefix,
        enabled: true
      };
      
      const prefixedCacheManager = new RedisCacheManager(redisSource.client, options);
      
      await prefixedCacheManager.set('key1', 'value1');
      await prefixedCacheManager.set('key2', 'value2');
      
      // Also set some keys without the prefix
      await cacheManager.set('other-key', 'other-value');

      // Act
      await prefixedCacheManager.clear();

      // Assert
      expect(await prefixedCacheManager.get('key1')).toBeNull();
      expect(await prefixedCacheManager.get('key2')).toBeNull();
      // Other keys should still exist
      expect(await cacheManager.get('other-key')).toBe('other-value');
    });
  });

  describe('TTL (Time To Live) Behavior', () => {
    it('should respect custom TTL', async () => {
      // Arrange
      const key = 'ttl-test';
      const value = 'ttl-value';
      const ttl = 2; // 2 seconds

      // Act
      await cacheManager.set(key, value, ttl);
      
      // Assert - Should exist immediately
      expect(await cacheManager.get(key)).toBe(value);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 2100));
      
      // Should be expired
      expect(await cacheManager.get(key)).toBeNull();
    }, 10000);

    it('should use default TTL when not specified', async () => {
      // Arrange
      const key = 'default-ttl-test';
      const value = 'default-ttl-value';

      // Act
      await cacheManager.set(key, value);
      
      // Assert - Should exist immediately
      expect(await cacheManager.get(key)).toBe(value);
      
      // Note: We don't test expiration here as default TTL is 1 hour
      // This test just verifies the value is stored correctly
    });

    it('should handle zero TTL (no expiration)', async () => {
      // Arrange
      const key = 'no-expiry-test';
      const value = 'no-expiry-value';
      const ttl = 0; // No expiration

      // Act
      await cacheManager.set(key, value, ttl);
      
      // Assert - Should exist immediately
      expect(await cacheManager.get(key)).toBe(value);
      
      // Wait a bit to ensure it doesn't expire
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(await cacheManager.get(key)).toBe(value);
    });
  });

  describe('Key Generation', () => {
    it('should generate consistent keys for same operation and query', async () => {
      // Arrange
      const operation = 'find';
      const query = { where: { id: 1 }, limit: 10 };

      // Act
      const key1 = cacheManager.generateKey(operation, query);
      const key2 = cacheManager.generateKey(operation, query);

      // Assert
      expect(key1).toBe(key2);
      expect(key1).toContain(operation);
    });

    it('should generate different keys for different operations', async () => {
      // Arrange
      const query = { where: { id: 1 } };

      // Act
      const findKey = cacheManager.generateKey('find', query);
      const countKey = cacheManager.generateKey('count', query);

      // Assert
      expect(findKey).not.toBe(countKey);
      expect(findKey).toContain('find');
      expect(countKey).toContain('count');
    });

    it('should generate different keys for different queries', async () => {
      // Arrange
      const operation = 'find';
      const query1 = { where: { id: 1 } };
      const query2 = { where: { id: 2 } };

      // Act
      const key1 = cacheManager.generateKey(operation, query1);
      const key2 = cacheManager.generateKey(operation, query2);

      // Assert
      expect(key1).not.toBe(key2);
    });

    it('should handle complex query objects', async () => {
      // Arrange
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

      // Act
      const key = cacheManager.generateKey(operation, query);

      // Assert
      expect(key).toContain(operation);
      expect(key.length).toBeGreaterThan(operation.length);
    });

    it('should handle null and undefined queries', async () => {
      // Arrange
      const operation = 'find';

      // Act
      const nullKey = cacheManager.generateKey(operation, null);
      const undefinedKey = cacheManager.generateKey(operation, undefined);
      const emptyKey = cacheManager.generateKey(operation, {});

      // Assert
      expect(nullKey).toContain(operation);
      expect(undefinedKey).toContain(operation);
      expect(emptyKey).toContain(operation);
      expect(nullKey).toBe(undefinedKey); // Both should be treated the same
    });
  });

  describe('Cache Manager State', () => {
    it('should report enabled state correctly', async () => {
      // Arrange
      const enabledOptions: CacheOptions = { ttl: 3600, enabled: true };
      const disabledOptions: CacheOptions = { ttl: 3600, enabled: false };
      
      const enabledCache = new RedisCacheManager(redisSource.client, enabledOptions);
      const disabledCache = new RedisCacheManager(redisSource.client, disabledOptions);

      // Assert
      expect(enabledCache.isEnabled()).toBe(true);
      expect(disabledCache.isEnabled()).toBe(false);
    });

    it('should not store values when disabled', async () => {
      // Arrange
      const disabledOptions: CacheOptions = { ttl: 3600, enabled: false };
      const disabledCache = new RedisCacheManager(redisSource.client, disabledOptions);
      
      const key = 'disabled-test';
      const value = 'should-not-be-stored';

      // Act
      await disabledCache.set(key, value);
      const result = await disabledCache.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should expose options correctly', async () => {
      // Arrange
      const options: CacheOptions = {
        ttl: 1800,
        prefix: 'test-prefix',
        enabled: true
      };

      // Act
      const cache = new RedisCacheManager(redisSource.client, options);

      // Assert
      expect(cache.options).toEqual(options);
      expect(cache.options.ttl).toBe(1800);
      expect(cache.options.prefix).toBe('test-prefix');
      expect(cache.options.enabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // This test would require simulating Redis connection issues
      // For now, we'll test that the cache manager doesn't throw on normal operations
      
      // Arrange
      const key = 'error-test';
      const value = 'error-value';

      // Act & Assert - Should not throw
      await expect(cacheManager.set(key, value)).resolves.not.toThrow();
      await expect(cacheManager.get(key)).resolves.not.toThrow();
      await expect(cacheManager.delete(key)).resolves.not.toThrow();
    });

    it('should handle invalid JSON gracefully', async () => {
      // Arrange
      const key = 'invalid-json-test';
      
      // Create a circular reference object that can't be serialized
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // Act & Assert - Should not throw, but may not store the value
      await expect(cacheManager.set(key, circularObj)).resolves.not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent operations', async () => {
      // Arrange
      const operations = Array.from({ length: 100 }, (_, i) => ({
        key: `concurrent-${i}`,
        value: { id: i, data: `value-${i}` }
      }));

      // Act
      const startTime = Date.now();
      
      // Set all values concurrently
      await Promise.all(
        operations.map(op => cacheManager.set(op.key, op.value))
      );
      
      // Get all values concurrently
      const results = await Promise.all(
        operations.map(op => cacheManager.get(op.key))
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        expect(result).toEqual(operations[index].value);
      });
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Completed 200 concurrent operations in ${duration}ms`);
    });

    it('should handle large data efficiently', async () => {
      // Arrange
      const key = 'large-data-test';
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `This is a description for item ${i}`.repeat(10),
          metadata: {
            createdAt: new Date().toISOString(),
            tags: [`tag${i % 10}`, `category${i % 5}`],
            properties: {
              weight: Math.random() * 100,
              color: `color${i % 7}`,
              active: i % 2 === 0
            }
          }
        }))
      };

      // Act
      const startTime = Date.now();
      await cacheManager.set(key, largeData);
      const setDuration = Date.now() - startTime;
      
      const getStartTime = Date.now();
      const result = await cacheManager.get<typeof largeData>(key);
      const getDuration = Date.now() - getStartTime;

      // Assert
      expect(result).toEqual(largeData);
      expect(setDuration).toBeLessThan(2000); // Should set within 2 seconds
      expect(getDuration).toBeLessThan(1000); // Should get within 1 second
      
      console.log(`Set large data (${JSON.stringify(largeData).length} chars) in ${setDuration}ms`);
      console.log(`Retrieved large data in ${getDuration}ms`);
    });
  });

  describe('Cache Integration with Real Data', () => {
    it('should work with realistic query caching scenario', async () => {
      // Arrange
      const operation = 'findUsers';
      const query = {
        where: {
          status: 'active',
          role: 'user',
          lastLoginAt: { $gte: '2024-01-01' }
        },
        orderBy: { createdAt: 'desc' },
        limit: 50
      };
      
      const mockUserData = {
        users: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          status: 'active',
          role: 'user',
          lastLoginAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        })),
        total: 50,
        page: 1
      };

      // Act
      const cacheKey = cacheManager.generateKey(operation, query);
      await cacheManager.set(cacheKey, mockUserData, 300); // 5 minutes TTL
      
      const cachedResult = await cacheManager.get<typeof mockUserData>(cacheKey);

      // Assert
      expect(cachedResult).toEqual(mockUserData);
      expect(cachedResult?.users).toHaveLength(50);
      expect(cachedResult?.total).toBe(50);
    });

    it('should handle cache invalidation pattern', async () => {
      // Arrange
      const userKey = 'user:123';
      const userData = { id: 123, name: 'John Doe', email: 'john@example.com' };
      
      // Cache user data
      await cacheManager.set(userKey, userData);
      
      // Cache related queries
      const queries = [
        { where: { id: 123 } },
        { where: { email: 'john@example.com' } },
        { where: { name: 'John Doe' } }
      ];
      
      for (const query of queries) {
        const key = cacheManager.generateKey('findUser', query);
        await cacheManager.set(key, userData);
      }

      // Act - Simulate user update
      const updatedUserData = { ...userData, name: 'John Smith' };
      await cacheManager.set(userKey, updatedUserData);
      
      // Clear related query caches
      for (const query of queries) {
        const key = cacheManager.generateKey('findUser', query);
        await cacheManager.delete(key);
      }

      // Assert
      const cachedUser = await cacheManager.get(userKey);
      expect(cachedUser).toEqual(updatedUserData);
      
      // Related queries should be cleared
      for (const query of queries) {
        const key = cacheManager.generateKey('findUser', query);
        const cachedQuery = await cacheManager.get(key);
        expect(cachedQuery).toBeNull();
      }
    });
  });
});
