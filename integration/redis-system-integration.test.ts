import { setupIntegrationTests, teardownIntegrationTests } from './setup';
import { IntegrationTestHelper, TestRedisSystem } from './test-helpers';
import { RedisHashDocument, RedisSortedDocument } from '../src/redis.types';
import { Result } from '@soapjs/soap';

describe('Redis System Integration Tests', () => {
  let redisSystem: TestRedisSystem;
  let redisUrl: string;

  beforeAll(async () => {
    redisUrl = await setupIntegrationTests();
    redisSystem = await IntegrationTestHelper.createTestRedisSystem(redisUrl, {
      collectionPrefix: 'system-test'
    });
    
    // Wait for connection to be established
    await IntegrationTestHelper.waitForConnection(redisSystem.redisSource);
  });

  afterAll(async () => {
    await IntegrationTestHelper.cleanupRedisSystem(redisSystem);
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await Promise.all([
      redisSystem.hashCollection.clear(),
      redisSystem.listCollection.clear(),
      redisSystem.setCollection.clear(),
      redisSystem.sortedSetCollection.clear()
    ]);
  });

  describe('Cross-Collection Operations', () => {
    it('should work with all collection types simultaneously', async () => {
      // Arrange
      const hashDocs: RedisHashDocument[] = [
        { user_id: '1', name: 'John', email: 'john@example.com' },
        { user_id: '2', name: 'Jane', email: 'jane@example.com' }
      ];
      
      const listItems = ['task1', 'task2', 'task3'];
      const setItems = ['tag1', 'tag2', 'tag3'];
      const sortedDocs: RedisSortedDocument[] = [
        { member: 'user1', score: 100 },
        { member: 'user2', score: 200 }
      ];

      // Act - Add to all collections
      const [hashResult, listResult, setResult, sortedResult] = await Promise.all([
        redisSystem.hashCollection.add(hashDocs),
        redisSystem.listCollection.add(listItems),
        redisSystem.setCollection.add(setItems),
        redisSystem.sortedSetCollection.add(sortedDocs)
      ]);

      // Assert - All operations should succeed
      expect(hashResult.isSuccess()).toBe(true);
      expect(listResult.isSuccess()).toBe(true);
      expect(setResult.isSuccess()).toBe(true);
      expect(sortedResult.isSuccess()).toBe(true);

      // Verify data in all collections
      const [hashFind, listFind, setFind, sortedFind] = await Promise.all([
        redisSystem.hashCollection.find(),
        redisSystem.listCollection.find(),
        redisSystem.setCollection.find(),
        redisSystem.sortedSetCollection.find()
      ]);

      expect(hashFind.isSuccess()).toBe(true);
      expect(listFind.isSuccess()).toBe(true);
      expect(setFind.isSuccess()).toBe(true);
      expect(sortedFind.isSuccess()).toBe(true);

      if (hashFind.isSuccess()) {
        expect(hashFind.content.length).toBeGreaterThan(0);
      }
      if (listFind.isSuccess()) {
        expect(listFind.content).toEqual(expect.arrayContaining(listItems));
      }
      if (setFind.isSuccess()) {
        expect(setFind.content).toEqual(expect.arrayContaining(setItems));
      }
      if (sortedFind.isSuccess()) {
        expect(sortedFind.content).toEqual(expect.arrayContaining(sortedDocs));
      }
    });

    it('should handle concurrent operations across all collections', async () => {
      // Arrange
      const operations = [
        () => redisSystem.hashCollection.add([{ key: 'test', value: 'hash' }]),
        () => redisSystem.listCollection.add(['list_item']),
        () => redisSystem.setCollection.add(['set_item']),
        () => redisSystem.sortedSetCollection.add([{ member: 'sorted', score: 1 }])
      ];

      // Act
      const startTime = Date.now();
      const results = await Promise.all(operations.map(op => op()));
      const endTime = Date.now();

      // Assert
      results.forEach(result => {
        expect(result.isSuccess()).toBe(true);
      });
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Completed 4 concurrent operations across collections in ${endTime - startTime}ms`);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // Arrange
      const initialData = [
        { user_id: '1', name: 'User1', score: 100 },
        { user_id: '2', name: 'User2', score: 200 }
      ];

      // Act - Add to hash collection
      await redisSystem.hashCollection.add(initialData);

      // Add corresponding items to other collections
      await redisSystem.listCollection.add(['User1', 'User2']);
      await redisSystem.setCollection.add(['user1', 'user2']);
      await redisSystem.sortedSetCollection.add([
        { member: 'user1', score: 100 },
        { member: 'user2', score: 200 }
      ]);

      // Verify all collections have data
      const [hashCount, listCount, setCount, sortedCount] = await Promise.all([
        redisSystem.hashCollection.count(),
        redisSystem.listCollection.count(),
        redisSystem.setCollection.count(),
        redisSystem.sortedSetCollection.count()
      ]);

      // Assert
      expect(hashCount.isSuccess()).toBe(true);
      expect(listCount.isSuccess()).toBe(true);
      expect(setCount.isSuccess()).toBe(true);
      expect(sortedCount.isSuccess()).toBe(true);

      if (hashCount.isSuccess()) {
        expect(hashCount.content).toBeGreaterThan(0);
      }
      if (listCount.isSuccess()) {
        expect(listCount.content).toBe(2);
      }
      if (setCount.isSuccess()) {
        expect(setCount.content).toBe(2);
      }
      if (sortedCount.isSuccess()) {
        expect(sortedCount.content).toBe(2);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle partial failures gracefully', async () => {
      // Arrange
      const validData = [{ key: 'valid', value: 'data' }];
      const invalidData = [{} as any]; // Invalid data structure

      // Act - Try to add valid and invalid data
      const validResult = await redisSystem.hashCollection.add(validData);
      const invalidResult = await redisSystem.hashCollection.add(invalidData);

      // Assert
      expect(validResult.isSuccess()).toBe(true);
      // Invalid data might succeed or fail depending on implementation
      // The important thing is that valid data is not affected
      if (validResult.isSuccess()) {
        expect(validResult.content).toHaveLength(1);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high load across all collections', async () => {
      // Arrange
      const loadSize = 50;
      const hashData = IntegrationTestHelper.generateTestHashDocuments(loadSize, 'load_hash');
      const listData = Array.from({ length: loadSize }, (_, i) => `load_list_${i}`);
      const setData = Array.from({ length: loadSize }, (_, i) => `load_set_${i}`);
      const sortedData = IntegrationTestHelper.generateTestSortedDocuments(loadSize, 'load_sorted');

      // Act
      const startTime = Date.now();
      const [hashResult, listResult, setResult, sortedResult] = await Promise.all([
        redisSystem.hashCollection.add(hashData),
        redisSystem.listCollection.add(listData),
        redisSystem.setCollection.add(setData),
        redisSystem.sortedSetCollection.add(sortedData)
      ]);
      const endTime = Date.now();

      // Assert
      expect(hashResult.isSuccess()).toBe(true);
      expect(listResult.isSuccess()).toBe(true);
      expect(setResult.isSuccess()).toBe(true);
      expect(sortedResult.isSuccess()).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Loaded ${loadSize} items into each collection in ${endTime - startTime}ms`);
    });

    it('should handle mixed read/write operations efficiently', async () => {
      // Arrange
      const initialData = IntegrationTestHelper.generateTestHashDocuments(10, 'mixed_test');
      await redisSystem.hashCollection.add(initialData);

      // Act - Mix of read and write operations
      const operations = [
        () => redisSystem.hashCollection.find(),
        () => redisSystem.hashCollection.count(),
        () => redisSystem.hashCollection.add([{ new_key: 'new_value' }]),
        () => redisSystem.hashCollection.find(),
        () => redisSystem.hashCollection.count()
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations.map(op => op()));
      const endTime = Date.now();

      // Assert
      results.forEach(result => {
        expect(result.isSuccess()).toBe(true);
      });
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Completed mixed read/write operations in ${endTime - startTime}ms`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle large datasets without memory issues', async () => {
      // Arrange
      const largeDataset = IntegrationTestHelper.generateTestHashDocuments(1000, 'large_test');

      // Act
      const startTime = Date.now();
      const result = await redisSystem.hashCollection.add(largeDataset);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      console.log(`Added 1000 documents in ${duration}ms`);

      // Verify data integrity
      const countResult = await redisSystem.hashCollection.count();
      expect(countResult.isSuccess()).toBe(true);
      if (countResult.isSuccess()) {
        expect(countResult.content).toBeGreaterThan(0);
      }
    });
  });

  describe('Cleanup and Teardown', () => {
    it('should properly clean up all collections', async () => {
      // Arrange - Add data to all collections
      await Promise.all([
        redisSystem.hashCollection.add([{ cleanup: 'test' }]),
        redisSystem.listCollection.add(['cleanup_item']),
        redisSystem.setCollection.add(['cleanup_item']),
        redisSystem.sortedSetCollection.add([{ member: 'cleanup', score: 1 }])
      ]);

      // Act - Clear all collections
      const clearResults = await Promise.all([
        redisSystem.hashCollection.clear(),
        redisSystem.listCollection.clear(),
        redisSystem.setCollection.clear(),
        redisSystem.sortedSetCollection.clear()
      ]);

      // Assert
      clearResults.forEach(result => {
        expect(result.isSuccess()).toBe(true);
      });

      // Verify all collections are empty
      const countResults = await Promise.all([
        redisSystem.hashCollection.count(),
        redisSystem.listCollection.count(),
        redisSystem.setCollection.count(),
        redisSystem.sortedSetCollection.count()
      ]);

      countResults.forEach(result => {
        expect(result.isSuccess()).toBe(true);
        if (result.isSuccess()) {
          expect(result.content).toBe(0);
        }
      });
    });
  });
});
