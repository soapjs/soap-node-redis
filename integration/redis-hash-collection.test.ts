import { setupIntegrationTests, teardownIntegrationTests } from './setup';
import { IntegrationTestHelper, TestRedisSystem } from './test-helpers';
import { RedisHashDocument } from '../src/redis.types';
import { Result } from '@soapjs/soap';

describe('Redis Hash Collection Integration Tests', () => {
  let redisSystem: TestRedisSystem;
  let redisUrl: string;

  beforeAll(async () => {
    redisUrl = await setupIntegrationTests();
    redisSystem = await IntegrationTestHelper.createTestRedisSystem(redisUrl, {
      collectionPrefix: 'hash-test'
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
    await redisSystem.hashCollection.clear();
  });

  describe('Basic Operations', () => {
    it('should add documents to hash collection', async () => {
      // Arrange
      const testDocuments: RedisHashDocument[] = [
        { name: 'John Doe', age: '30', email: 'john@example.com' },
        { name: 'Jane Smith', age: '25', email: 'jane@example.com' }
      ];

      // Act
      const result = await redisSystem.hashCollection.add(testDocuments);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(2);
        expect(result.content[0]).toEqual(testDocuments[0]);
        expect(result.content[1]).toEqual(testDocuments[1]);
      }
    });

    it('should find all documents in hash collection', async () => {
      // Arrange
      const testDocuments: RedisHashDocument[] = [
        { name: 'John Doe', age: '30' },
        { name: 'Jane Smith', age: '25' }
      ];
      await redisSystem.hashCollection.add(testDocuments);

      // Act
      const result = await redisSystem.hashCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(2);
        // Note: Redis hash returns individual key-value pairs, not complete documents
        expect(result.content.some(doc => doc.name === 'John Doe')).toBe(true);
        expect(result.content.some(doc => doc.name === 'Jane Smith')).toBe(true);
      }
    });

    it('should count documents in hash collection', async () => {
      // Arrange
      const testDocuments: RedisHashDocument[] = [
        { name: 'John Doe', age: '30' },
        { name: 'Jane Smith', age: '25' }
      ];
      await redisSystem.hashCollection.add(testDocuments);

      // Act
      const result = await redisSystem.hashCollection.count();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toBe(2); // 2 documents
      }
    });

    it('should remove documents from hash collection', async () => {
      // Arrange
      const testDocuments: RedisHashDocument[] = [
        { name: 'John Doe', age: '30' },
        { name: 'Jane Smith', age: '25' }
      ];
      await redisSystem.hashCollection.add(testDocuments);

      // Act
      const result = await redisSystem.hashCollection.remove({} as any);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content.deletedCount).toBeGreaterThan(0);
      }
    });

    it('should clear all documents from hash collection', async () => {
      // Arrange
      const testDocuments: RedisHashDocument[] = [
        { name: 'John Doe', age: '30' },
        { name: 'Jane Smith', age: '25' }
      ];
      await redisSystem.hashCollection.add(testDocuments);

      // Act
      const result = await redisSystem.hashCollection.clear();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toBe('success');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty array when adding documents', async () => {
      // Act
      const result = await redisSystem.hashCollection.add([]);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(0);
      }
    });

    it('should handle find operation on empty collection', async () => {
      // Act
      const result = await redisSystem.hashCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(0);
      }
    });

    it('should handle count operation on empty collection', async () => {
      // Act
      const result = await redisSystem.hashCollection.count();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toBe(0);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of documents efficiently', async () => {
      // Arrange
      const largeDocumentSet = IntegrationTestHelper.generateTestHashDocuments(100, 'perf_test');

      // Act
      const startTime = Date.now();
      const result = await redisSystem.hashCollection.add(largeDocumentSet);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Added 100 documents in ${duration}ms`);
    });

    it('should handle concurrent operations', async () => {
      // Arrange
      const documentSets = Array.from({ length: 5 }, (_, i) => 
        IntegrationTestHelper.generateTestHashDocuments(10, `concurrent_${i}`)
      );

      // Act
      const startTime = Date.now();
      const promises = documentSets.map(docs => redisSystem.hashCollection.add(docs));
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
    it('should handle different data types in hash documents', async () => {
      // Arrange
      const testDocument: RedisHashDocument = {
        stringField: 'test string',
        numberField: 42,
        objectField: { nested: 'value' },
        booleanField: true
      };

      // Act
      const result = await redisSystem.hashCollection.add([testDocument]);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(1);
      }
    });
  });
});
