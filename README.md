# @soapjs/soap-node-redis

This package provides Redis integration for the SoapJS framework, enabling seamless interaction with Redis databases and providing powerful caching capabilities. It ensures that your data access layer is clean, efficient, and scalable with comprehensive Redis data structure support.

## Features

- **Clean Architecture Support**: Follows SoapJS clean architecture patterns with full abstraction support.
- **Type Safety**: Full TypeScript support with comprehensive type definitions.
- **Redis Collections**: Full implementation of Redis data structures (Hashes, Lists, Sets, Sorted Sets).
- **Advanced Caching**: Powerful Redis cache manager with TTL support, key generation, and cache invalidation.
- **Query Builder**: Advanced query building with Where conditions and RedisSearch support.
- **Connection Management**: Robust Redis connection management with configurable options.
- **Performance Monitoring**: Built-in performance monitoring with metrics collection and slow query detection.
- **Data Serialization**: Automatic JSON serialization/deserialization with circular reference handling.
- **Error Handling**: Comprehensive error handling with specific Redis error types.
- **Testing Support**: Complete unit and integration test coverage with Testcontainers.

### Collections Included

- **RedisHashCollection**: Redis hashes for structured data storage and retrieval.
- **RedisListCollection**: Redis lists for ordered data, queues, and logs.
- **RedisSetCollection**: Redis sets for unique collections and tags.
- **RedisSortedSetCollection**: Redis sorted sets for rankings and leaderboards.
- **RedisCacheManager**: Advanced caching with TTL, invalidation, and performance monitoring.

## Installation

Remember to have `redis` and `@soapjs/soap` installed in your project in which you want to use this package.

```bash
npm install @soapjs/soap-node-redis
```

## Quick Start

### 1. Import the necessary classes:

```typescript
import {
  RedisSource,
  RedisConfig,
  RedisCacheManager,
  RedisHashCollection,
  RedisListCollection,
  RedisSetCollection,
  RedisSortedSetCollection,
  RedisQueryFactory,
  RedisUtils
} from '@soapjs/soap-node-redis';
import { Where, MetaMapper, DatabaseContext, ReadRepository, ReadWriteRepository, Entity } from '@soapjs/soap';
```

### 2. Set up your Redis configuration:

```typescript
const config = new RedisConfig({
  hosts: ['localhost'],
  ports: [6379],
  user: 'user',
  password: 'password',
  database: 0,
  iana: false
});
```

### 3. Create a new `RedisSource` instance:

```typescript
const redisSource = await RedisSource.create(config);
```

### 4. Define your entities and models:

```typescript
// Entity
interface User extends Entity {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  tags: string[];
  metadata: Record<string, any>;
}

// Redis Hash Model
interface UserHashModel {
  id: string;
  name: string;
  email: string;
  created_at: string;
  tags_json: string;
  metadata_json: string;
}
```

### 5. Create Redis collections and use with SOAPJS repositories:

```typescript
// Create mapper
const userMapper = new MetaMapper(User, UserHashModel);

// Create Redis hash collection
const userCollection = new RedisHashCollection<UserHashModel>(
  redisSource,
  'users',
  {
    // Optional: Redis collection options
    keyPrefix: 'user:',
    ttl: 3600 // 1 hour TTL
  }
);

// Create data context
const userContext = new DatabaseContext(
  userCollection,
  userMapper,
  redisSource.sessions
);

// Create repositories using SOAPJS abstractions
const userReadRepo = new ReadRepository(userContext);
const userRepo = new ReadWriteRepository(userContext);
```

### 6. Using repositories with SOAPJS abstractions:

#### Basic CRUD Operations

```typescript
// Find users with Where conditions
const where = new Where()
  .valueOf('status').isEq('active')
  .and.valueOf('age').isGte(18);

const result = await userRepo.find({ where });
if (result.isSuccess()) {
  const users = result.content;
  console.log('Found users:', users);
}

// Count users
const countResult = await userRepo.count({ where });
if (countResult.isSuccess()) {
  console.log('User count:', countresult.content);
}

// Add new user
const newUser: User = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date(),
  tags: ['admin', 'user'],
  metadata: { role: 'admin', permissions: ['read', 'write'] }
};

const addResult = await userRepo.add([newUser]);
if (addResult.isSuccess()) {
  console.log('User added:', addresult.content);
}

// Update user
const updateResult = await userRepo.update({
  where: new Where().valueOf('id').isEq('user-123'),
  updates: [{ name: 'Jane Doe' }],
  methods: ['updateOne']
});
if (updateResult.isSuccess()) {
  console.log('User updated:', updateresult.content);
}

// Remove user
const removeResult = await userRepo.remove({
  where: new Where().valueOf('id').isEq('user-123')
});
if (removeResult.isSuccess()) {
  console.log('User removed:', removeresult.content);
}
```

## Redis Collections

### Redis Hash Collection

Perfect for storing user profiles, configuration data, or any key-value pairs:

```typescript
const userCollection = new RedisHashCollection<UserHashModel>(
  redisSource,
  'users',
  {
    keyPrefix: 'user:',
    ttl: 3600
  }
);

// Add user data
await userCollection.add([
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    created_at: new Date().toISOString(),
    tags_json: JSON.stringify(['admin', 'user']),
    metadata_json: JSON.stringify({ role: 'admin' })
  }
]);

// Find users
const users = await userCollection.find({ where: new Where().valueOf('name').isEq('John Doe') });
```

### Redis List Collection

Ideal for queues, logs, or ordered data:

```typescript
const logCollection = new RedisListCollection<LogEntry>(
  redisSource,
  'logs',
  {
    keyPrefix: 'log:',
    ttl: 86400 // 24 hours
  }
);

// Add log entries (maintains order)
await logCollection.add([
  { id: 'log-1', message: 'User logged in', timestamp: Date.now() },
  { id: 'log-2', message: 'User performed action', timestamp: Date.now() }
]);

// Get recent logs
const recentLogs = await logCollection.find({ 
  where: new Where().valueOf('timestamp').isGte(Date.now() - 3600000) // Last hour
});
```

### Redis Set Collection

Great for unique collections, tags, or categories:

```typescript
const tagCollection = new RedisSetCollection<Tag>(
  redisSource,
  'tags',
  {
    keyPrefix: 'tag:',
    ttl: 0 // No expiration
  }
);

// Add unique tags
await tagCollection.add([
  { id: 'tag-1', name: 'javascript', color: '#f7df1e' },
  { id: 'tag-2', name: 'typescript', color: '#3178c6' }
]);

// Find all tags
const allTags = await tagCollection.find();
```

### Redis Sorted Set Collection

Perfect for rankings, leaderboards, or time-ordered data:

```typescript
const leaderboardCollection = new RedisSortedSetCollection<Score>(
  redisSource,
  'leaderboard',
  {
    keyPrefix: 'score:',
    ttl: 0
  }
);

// Add scores (automatically sorted by score)
await leaderboardCollection.add([
  { id: 'player-1', name: 'Alice', score: 1500 },
  { id: 'player-2', name: 'Bob', score: 1200 },
  { id: 'player-3', name: 'Charlie', score: 1800 }
]);

// Get top players
const topPlayers = await leaderboardCollection.find({
  where: new Where().valueOf('score').isGte(1000),
  sort: { score: 'desc' },
  limit: 10
});
```

## Advanced Caching with RedisCacheManager

The `RedisCacheManager` provides powerful caching capabilities that integrate seamlessly with the SoapJS framework:

### Basic Cache Operations

```typescript
import { RedisCacheManager } from '@soapjs/soap-node-redis';

// Create cache manager
const cacheManager = new RedisCacheManager(redisClient, {
  enabled: true,
  ttl: 3600, // 1 hour default TTL
  prefix: 'app:cache:'
});

// Cache data
await cacheManager.set('user:123', { name: 'John', email: 'john@example.com' });

// Retrieve cached data
const user = await cacheManager.get('user:123');
console.log(user); // { name: 'John', email: 'john@example.com' }

// Cache with custom TTL
await cacheManager.set('session:abc', sessionData, 1800); // 30 minutes

// Cache with no expiration
await cacheManager.set('config:app', appConfig, 0);

// Delete from cache
await cacheManager.delete('user:123');

// Clear all cache
await cacheManager.clear();

// Clear cache with prefix
await cacheManager.clear('user:');
```

### Query Result Caching

```typescript
class UserService {
  constructor(
    private userRepo: ReadWriteRepository<User>,
    private cacheManager: RedisCacheManager
  ) {}

  async findUserById(id: string): Promise<Result<User | null>> {
    // Generate cache key
    const cacheKey = this.cacheManager.generateKey('findUserById', { id });
    
    // Try to get from cache first
    const cachedUser = await this.cacheManager.get(cacheKey);
    if (cachedUser) {
      return Result.withSuccess(cachedUser);
    }

    // If not in cache, query database
    const where = new Where().valueOf('id').isEq(id);
    const result = await this.userRepo.find({ where, limit: 1 });
    
    if (result.isSuccess() && result.content.length > 0) {
      const user = result.content[0];
      
      // Cache the result
      await this.cacheManager.set(cacheKey, user, 1800); // 30 minutes
      
      return Result.withSuccess(user);
    }
    
    return Result.withSuccess(null);
  }

  async findActiveUsers(): Promise<Result<User[]>> {
    const cacheKey = this.cacheManager.generateKey('findActiveUsers', {});
    
    // Try cache first
    const cachedUsers = await this.cacheManager.get(cacheKey);
    if (cachedUsers) {
      return Result.withSuccess(cachedUsers);
    }

    // Query database
    const where = new Where().valueOf('status').isEq('active');
    const result = await this.userRepo.find({ where });
    
    if (result.isSuccess()) {
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, result.content, 300);
    }
    
    return result;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<Result<void>> {
    const result = await this.userRepo.update({
      where: new Where().valueOf('id').isEq(id),
      updates: [updates],
      methods: ['updateOne']
    });

    if (result.isSuccess()) {
      // Invalidate related cache entries
      await this.cacheManager.delete(this.cacheManager.generateKey('findUserById', { id }));
      await this.cacheManager.clear('findActiveUsers');
    }

    return result;
  }
}
```

## Testing

### Unit Tests

Run unit tests (mocked Redis):

```bash
npm run test:unit
```

### Integration Tests

Integration tests use **Testcontainers** to automatically start and manage Redis containers for testing.

#### Prerequisites

1. **Docker**: Ensure Docker is running on your system
2. **Testcontainers**: Automatically manages Redis containers
3. **No manual setup required**: Everything is handled automatically

#### Running Integration Tests

```bash
# Run only integration tests (requires Docker)
npm run test:integration

# Run all tests (unit + integration)
npm test
```

#### Integration Test Coverage

Integration tests cover:

- **Redis Collections**: CRUD operations, queries, performance tests
- **Cache Manager**: Caching operations, TTL behavior, key generation
- **Error Handling**: Connection errors, serialization errors
- **Real-world Scenarios**: Concurrent operations, large datasets, cache invalidation

## API Reference

### Core Classes

- **RedisSource**: Main Redis source class for managing connections and sessions
- **RedisCacheManager**: Redis cache manager implementing CacheManager interface
- **RedisHashCollection**: Redis hash collection implementation
- **RedisListCollection**: Redis list collection implementation
- **RedisSetCollection**: Redis set collection implementation
- **RedisSortedSetCollection**: Redis sorted set collection implementation
- **RedisQueryFactory**: Redis query factory for building complex queries
- **RedisWhereParser**: Parser for converting Where conditions to Redis queries
- **RedisUtils**: Utility functions for Redis operations

### Configuration Classes

- **RedisConfig**: Redis configuration with connection settings
- **CollectionOptions**: Options for Redis collections including performance monitoring

### Interfaces

- **RedisClientType**: Type definition for Redis client
- **CacheOptions**: Configuration options for cache manager
- **CollectionOptions**: Options for Redis collections

## Error Handling

The package provides comprehensive error handling with specific Redis error types:

```typescript
import { RedisConnectionError, RedisSerializationError } from '@soapjs/soap-node-redis';

try {
  const result = await userRepo.add([user]);
  if (result.isSuccess()) {
    console.log('User added successfully');
  } else {
    const error = result.failure.error;
    
    if (error instanceof RedisConnectionError) {
      console.error('Redis connection error:', error.message);
    } else if (error instanceof RedisSerializationError) {
      console.error('Serialization error:', error.message);
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Performance Optimization

### Connection Pool Configuration

```typescript
const config = new RedisConfig({
  hosts: ['localhost'],
  ports: [6379],
  user: 'user',
  password: 'password',
  database: 0,
  iana: false,
  // Connection pool options
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true
});
```

### Caching Strategy

```typescript
// Use appropriate TTLs based on data volatility
const cacheStrategy = {
  userProfiles: 3600,      // 1 hour - relatively stable
  userSessions: 1800,      // 30 minutes - moderate volatility
  queryResults: 300,       // 5 minutes - high volatility
  appConfig: 0,            // No expiration - very stable
  realTimeData: 60         // 1 minute - very volatile
};
```

## Security Best Practices

### Authentication and Authorization

```typescript
// Use environment variables for sensitive data
const config = new RedisConfig({
  hosts: process.env.REDIS_HOSTS?.split(',') || ['localhost'],
  ports: process.env.REDIS_PORTS?.split(',').map(Number) || [6379],
  user: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  database: parseInt(process.env.REDIS_DATABASE || '0')
});
```

## Troubleshooting

### Common Issues

1. **Connection Issues**
   ```typescript
   // Check connection status
   const isConnected = await redisSource.client.ping();
   console.log('Redis connected:', isConnected);
   ```

2. **Memory Issues**
   ```typescript
   // Monitor memory usage
   const info = await redisSource.client.memory('usage');
   console.log('Memory usage:', info);
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [https://docs.soapjs.com](https://docs.soapjs.com)
- **Issues**: [GitHub Issues](https://github.com/soapjs/soap-node-redis/issues)
- **Discussions**: [GitHub Discussions](https://github.com/soapjs/soap-node-redis/discussions)
- **Email**: radoslaw.kamysz@gmail.com
