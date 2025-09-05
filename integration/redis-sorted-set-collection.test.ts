import { setupIntegrationTests, teardownIntegrationTests } from './setup';
import { IntegrationTestHelper, TestRedisSystem } from './test-helpers';
import { RedisSortedDocument } from '../src/redis.types';
import { Result } from '@soapjs/soap';

describe('Redis Sorted Set Collection Integration Tests', () => {
  let redisSystem: TestRedisSystem;
  let redisUrl: string;

  beforeAll(async () => {
    redisUrl = await setupIntegrationTests();
    redisSystem = await IntegrationTestHelper.createTestRedisSystem(redisUrl, {
      collectionPrefix: 'sorted-set-test'
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
    await redisSystem.sortedSetCollection.clear();
  });

  describe('Basic Operations', () => {
    it('should add documents to sorted set collection', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'member1', score: 10 },
        { member: 'member2', score: 20 },
        { member: 'member3', score: 30 }
      ];

      // Act
      const result = await redisSystem.sortedSetCollection.add(testDocuments);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(3);
        expect(result.content).toEqual(testDocuments);
      }
    });

    it('should find all documents in sorted set collection', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'member1', score: 10 },
        { member: 'member2', score: 20 },
        { member: 'member3', score: 30 }
      ];
      await redisSystem.sortedSetCollection.add(testDocuments);

      // Act
      const result = await redisSystem.sortedSetCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(3);
        expect(result.content).toEqual(expect.arrayContaining(testDocuments));
      }
    });

    it('should count documents in sorted set collection', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'member1', score: 10 },
        { member: 'member2', score: 20 },
        { member: 'member3', score: 30 }
      ];
      await redisSystem.sortedSetCollection.add(testDocuments);

      // Act
      const result = await redisSystem.sortedSetCollection.count();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toBe(3);
      }
    });

    it('should remove documents from sorted set collection', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'member1', score: 10 },
        { member: 'member2', score: 20 },
        { member: 'member3', score: 30 }
      ];
      await redisSystem.sortedSetCollection.add(testDocuments);

      // Act
      const result = await redisSystem.sortedSetCollection.remove({} as any);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content.deletedCount).toBeGreaterThan(0);
      }
    });

    it('should clear all documents from sorted set collection', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'member1', score: 10 },
        { member: 'member2', score: 20 },
        { member: 'member3', score: 30 }
      ];
      await redisSystem.sortedSetCollection.add(testDocuments);

      // Act
      const result = await redisSystem.sortedSetCollection.clear();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toBe('success');
      }
    });
  });

  describe('Score Ordering', () => {
    it('should maintain documents in score order', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'high', score: 100 },
        { member: 'low', score: 10 },
        { member: 'medium', score: 50 }
      ];

      // Act
      await redisSystem.sortedSetCollection.add(testDocuments);
      const result = await redisSystem.sortedSetCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(3);
        // Should be ordered by score (ascending)
        const scores = result.content.map(doc => doc.score);
        expect(scores).toEqual([10, 50, 100]);
      }
    });

    it('should handle duplicate scores with different members', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'member1', score: 50 },
        { member: 'member2', score: 50 },
        { member: 'member3', score: 50 }
      ];

      // Act
      await redisSystem.sortedSetCollection.add(testDocuments);
      const result = await redisSystem.sortedSetCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(3);
        result.content.forEach(doc => {
          expect(doc.score).toBe(50);
        });
      }
    });

    it('should handle negative scores', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'negative', score: -10 },
        { member: 'zero', score: 0 },
        { member: 'positive', score: 10 }
      ];

      // Act
      await redisSystem.sortedSetCollection.add(testDocuments);
      const result = await redisSystem.sortedSetCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(3);
        const scores = result.content.map(doc => doc.score);
        expect(scores).toEqual([-10, 0, 10]);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty array when adding documents', async () => {
      // Act
      const result = await redisSystem.sortedSetCollection.add([]);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(0);
      }
    });

    it('should handle find operation on empty collection', async () => {
      // Act
      const result = await redisSystem.sortedSetCollection.find();

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(0);
      }
    });

    it('should handle count operation on empty collection', async () => {
      // Act
      const result = await redisSystem.sortedSetCollection.count();

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
      const largeDocumentSet = IntegrationTestHelper.generateTestSortedDocuments(100, 'perf_test');

      // Act
      const startTime = Date.now();
      const result = await redisSystem.sortedSetCollection.add(largeDocumentSet);
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
        IntegrationTestHelper.generateTestSortedDocuments(10, `concurrent_${i}`)
      );

      // Act
      const startTime = Date.now();
      const promises = documentSets.map(docs => redisSystem.sortedSetCollection.add(docs));
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
    it('should handle different score types', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'integer', score: 42 },
        { member: 'float', score: 3.14 },
        { member: 'zero', score: 0 },
        { member: 'negative', score: -5.5 }
      ];

      // Act
      const result = await redisSystem.sortedSetCollection.add(testDocuments);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(4);
        expect(result.content).toEqual(expect.arrayContaining(testDocuments));
      }
    });

    it('should handle different member types', async () => {
      // Arrange
      const testDocuments: RedisSortedDocument[] = [
        { member: 'string_member', score: 10 },
        { member: '123', score: 20 },
        { member: 'special-chars_!@#', score: 30 }
      ];

      // Act
      const result = await redisSystem.sortedSetCollection.add(testDocuments);

      // Assert
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.content).toHaveLength(3);
        expect(result.content).toEqual(expect.arrayContaining(testDocuments));
      }
    });
  });

  describe('Score Updates', () => {
    it('should update score for existing member', async () => {
      // Arrange
      const initialDocuments: RedisSortedDocument[] = [
        { member: 'member1', score: 10 }
      ];
      await redisSystem.sortedSetCollection.add(initialDocuments);

      const updatedDocuments: RedisSortedDocument[] = [
        { member: 'member1', score: 50 } // Same member, different score
      ];

      // Act
      const result = await redisSystem.sortedSetCollection.add(updatedDocuments);

      // Assert
      expect(result.isSuccess()).toBe(true);
      
      // Verify the score was updated
      const findResult = await redisSystem.sortedSetCollection.find();
      expect(findResult.isSuccess()).toBe(true);
      if (findResult.isSuccess()) {
        const member1 = findResult.content.find(doc => doc.member === 'member1');
        expect(member1).toBeDefined();
        expect(member1?.score).toBe(50);
      }
    });
  });
});
