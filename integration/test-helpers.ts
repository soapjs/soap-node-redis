import { RedisSource } from '../src/redis.source';
import { RedisConfig } from '../src/redis.config';
import { RedisHashCollectionSource, RedisListCollection, RedisSetCollection, RedisSortedSetCollection } from '../src';
import { RedisHashDocument, RedisSortedDocument } from '../src/redis.types';

export interface TestRedisSystem {
  redisSource: RedisSource;
  hashCollection: RedisHashCollectionSource<RedisHashDocument>;
  listCollection: RedisListCollection<string>;
  setCollection: RedisSetCollection<string>;
  sortedSetCollection: RedisSortedSetCollection<RedisSortedDocument>;
}

export class IntegrationTestHelper {
  static async createTestRedisSystem(
    redisUrl: string,
    options?: {
      collectionPrefix?: string;
    }
  ): Promise<TestRedisSystem> {
    // Parse the Redis URL to extract host, port, and password
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

    const redisSource = await RedisSource.create(config);
    
    const prefix = options?.collectionPrefix || 'test';
    
    const hashCollection = new RedisHashCollectionSource(redisSource, `${prefix}:hash`);
    const listCollection = new RedisListCollection<string>(redisSource, `${prefix}:list`);
    const setCollection = new RedisSetCollection<string>(redisSource, `${prefix}:set`);
    const sortedSetCollection = new RedisSortedSetCollection(redisSource, `${prefix}:sorted-set`);

    return {
      redisSource,
      hashCollection,
      listCollection,
      setCollection,
      sortedSetCollection
    };
  }

  static async waitForConnection(redisSource: RedisSource, timeoutMs: number = 5000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Test connection with a simple ping
        const pingResult = await redisSource.client.ping();
        if (pingResult === 'PONG') {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Failed to establish Redis connection within ${timeoutMs}ms`);
  }

  static async waitForData(
    expectedCount: number,
    dataArray: any[],
    timeoutMs: number = 10000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (dataArray.length >= expectedCount) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Expected ${expectedCount} items, but received ${dataArray.length} within ${timeoutMs}ms`);
  }

  static async clearAllCollections(system: TestRedisSystem): Promise<void> {
    try {
      await Promise.all([
        system.hashCollection.clear(),
        system.listCollection.clear(),
        system.setCollection.clear(),
        system.sortedSetCollection.clear()
      ]);
    } catch (error) {
      console.warn('Error during collection cleanup:', error);
    }
  }

  static async cleanupRedisSystem(system: TestRedisSystem): Promise<void> {
    try {
      if (system.redisSource) {
        await system.redisSource.client.disconnect();
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }

  static generateTestHashDocument(
    key: string,
    value: string | number | object
  ): RedisHashDocument {
    return {
      [key]: value
    };
  }

  static generateTestHashDocuments(
    count: number,
    keyPrefix: string = 'key'
  ): RedisHashDocument[] {
    return Array.from({ length: count }, (_, index) => 
      this.generateTestHashDocument(`${keyPrefix}_${index + 1}`, `value_${index + 1}`)
    );
  }

  static generateTestSortedDocument(
    member: string,
    score: number
  ): RedisSortedDocument {
    return {
      member,
      score
    };
  }

  static generateTestSortedDocuments(
    count: number,
    memberPrefix: string = 'member'
  ): RedisSortedDocument[] {
    return Array.from({ length: count }, (_, index) => 
      this.generateTestSortedDocument(`${memberPrefix}_${index + 1}`, index + 1)
    );
  }

  static async measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string = 'Operation'
  ): Promise<{ result: T; duration: number; eventsPerSecond?: number }> {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`${operationName} completed in ${duration}ms`);

    return { result, duration };
  }

  static async simulateLoad(
    collection: any,
    operation: 'add' | 'find' | 'count' | 'remove',
    itemCount: number,
    batchSize: number = 10,
    delayBetweenBatches: number = 100
  ): Promise<void> {
    const items = this.generateTestHashDocuments(itemCount, 'load_test');
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Execute batch operation
      switch (operation) {
        case 'add':
          await collection.add(batch);
          break;
        case 'find':
          await collection.find();
          break;
        case 'count':
          await collection.count();
          break;
        case 'remove':
          await collection.remove({ where: {} } as any);
          break;
      }
      
      // Wait between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
  }

  static async waitForHealthCheck(
    redisSource: RedisSource,
    expectedHealth: boolean = true,
    timeoutMs: number = 5000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const pingResult = await redisSource.client.ping();
        const isHealthy = pingResult === 'PONG';
        if (isHealthy === expectedHealth) {
          return;
        }
      } catch (error) {
        if (!expectedHealth) {
          return; // Expected error
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Health check did not return ${expectedHealth} within ${timeoutMs}ms`);
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    throw lastError!;
  }
}
