import { setupIntegrationTests, teardownIntegrationTests } from './setup';
import { IntegrationTestHelper, TestRedisSystem } from './test-helpers';
import { Result } from '@soapjs/soap';

describe('Redis List Collection Integration Tests', () => {
  let redisSystem: TestRedisSystem;
  let redisUrl: string;

  beforeAll(async () => {
    redisUrl = await setupIntegrationTests();
    redisSystem = await IntegrationTestHelper.createTestRedisSystem(redisUrl, {
      collectionPrefix: 'list-test'
    });
    
    // Wait for connection to be established
    await IntegrationTestHelper.waitForConnection(redisSystem.redisSource);
  });

  afterAll(async () => {
    await IntegrationTestHelper.cleanupRedisSystem(redisSystem);
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await redisSystem.listCollection.clear();
  });

  describe('Basic Operations', () => {
    it('should add items to list collection', async () => {
      // Arrange
      const testItems = ['item1', 'item2', 'item3'];

      // Act
      const result = await redisSystem.listCollection.add(testItems);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(3);
        expect(result.content).toEqual(testItems);
      }
    });

    it('should find all items in list collection', async () => {
      // Arrange
      const testItems = ['item1', 'item2', 'item3'];
      await redisSystem.listCollection.add(testItems);

      // Act
      const result = await redisSystem.listCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(3);
        expect(result.content).toEqual(expect.arrayContaining(testItems));
      }
    });

    it('should count items in list collection', async () => {
      // Arrange
      const testItems = ['item1', 'item2', 'item3'];
      await redisSystem.listCollection.add(testItems);

      // Act
      const result = await redisSystem.listCollection.count();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toBe(3);
      }
    });

    it('should remove items from list collection', async () => {
      // Arrange
      const testItems = ['item1', 'item2', 'item3'];
      await redisSystem.listCollection.add(testItems);

      // Act
      const result = await redisSystem.listCollection.remove({} as any);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content.deletedCount).toBeGreaterThan(0);
      }
    });

    it('should clear all items from list collection', async () => {
      // Arrange
      const testItems = ['item1', 'item2', 'item3'];
      await redisSystem.listCollection.add(testItems);

      // Act
      const result = await redisSystem.listCollection.clear();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toBe('success');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty array when adding items', async () => {
      // Act
      const result = await redisSystem.listCollection.add([]);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(0);
      }
    });

    it('should handle find operation on empty collection', async () => {
      // Act
      const result = await redisSystem.listCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(0);
      }
    });

    it('should handle count operation on empty collection', async () => {
      // Act
      const result = await redisSystem.listCollection.count();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toBe(0);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of items efficiently', async () => {
      // Arrange
      const largeItemSet = Array.from({ length: 100 }, (_, i) => `item_${i + 1}`);

      // Act
      const startTime = Date.now();
      const result = await redisSystem.listCollection.add(largeItemSet);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Added 100 items in ${duration}ms`);
    });

    it('should handle concurrent operations', async () => {
      // Arrange
      const itemSets = Array.from({ length: 5 }, (_, i) => 
        Array.from({ length: 10 }, (_, j) => `concurrent_${i}_${j}`)
      );

      // Act
      const startTime = Date.now();
      const promises = itemSets.map(items => redisSystem.listCollection.add(items));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      results.forEach(result => {
        expect(result.isSuccess()).toBe(true);
      });
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      console.log(`Completed 5 concurrent operations in ${endTime - startTime}ms`);
    });
  });

  describe('Data Types', () => {
    it('should handle different data types in list items', async () => {
      // Arrange
      const testItems = [
        'string item',
        '42',
        'true',
        '{"nested": "object"}'
      ];

      // Act
      const result = await redisSystem.listCollection.add(testItems);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(4);
        expect(result.content).toEqual(testItems);
      }
    });
  });

  describe('List Order', () => {
    it('should maintain insertion order', async () => {
      // Arrange
      const testItems = ['first', 'second', 'third'];

      // Act
      await redisSystem.listCollection.add(testItems);
      const result = await redisSystem.listCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toEqual(testItems);
      }
    });

    it('should handle multiple additions maintaining order', async () => {
      // Arrange
      const firstBatch = ['batch1_item1', 'batch1_item2'];
      const secondBatch = ['batch2_item1', 'batch2_item2'];

      // Act
      await redisSystem.listCollection.add(firstBatch);
      await redisSystem.listCollection.add(secondBatch);
      const result = await redisSystem.listCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toEqual([...firstBatch, ...secondBatch]);
      }
    });
  });
});
