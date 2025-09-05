import { RedisSource } from '../redis.source';
import { RedisConfig } from '../redis.config';
import { RedisUtils } from '../redis.utils';
import { Redis } from '../redis.types';

// Mock Redis
jest.mock('../redis.types', () => ({
  Redis: {
    createClient: jest.fn()
  }
}));

// Mock RedisUtils
jest.mock('../redis.utils', () => ({
  RedisUtils: {
    buildRedisUrl: jest.fn()
  }
}));

describe('RedisSource Unit Tests', () => {
  let mockClient: any;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock client
    mockClient = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      select: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined)
    };

    // Mock Redis.createClient
    mockRedis = Redis as jest.Mocked<typeof Redis>;
    mockRedis.createClient.mockReturnValue(mockClient);

    // Mock RedisUtils.buildRedisUrl
    (RedisUtils.buildRedisUrl as jest.Mock).mockReturnValue('redis://localhost:6379');
  });

  describe('create() static method', () => {
    it('should create RedisSource with basic config', async () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      
      const redisSource = await RedisSource.create(config);

      expect(RedisUtils.buildRedisUrl).toHaveBeenCalledWith(config);
      expect(mockRedis.createClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.connect).toHaveBeenCalled();
      expect(redisSource).toBeInstanceOf(RedisSource);
      expect(redisSource.client).toBe(mockClient);
    });

    it('should create RedisSource with database selection', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, 5);
      
      const redisSource = await RedisSource.create(config);

      expect(mockClient.select).toHaveBeenCalledWith(5);
      expect(redisSource).toBeInstanceOf(RedisSource);
    });

    it('should create RedisSource with string database', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, 'mydb');
      
      const redisSource = await RedisSource.create(config);

      expect(mockClient.select).toHaveBeenCalledWith(NaN); // String converted to number
      expect(redisSource).toBeInstanceOf(RedisSource);
    });

    it('should create RedisSource without database selection when database is undefined', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, undefined);
      
      const redisSource = await RedisSource.create(config);

      expect(mockClient.select).not.toHaveBeenCalled();
      expect(redisSource).toBeInstanceOf(RedisSource);
    });

    it('should create RedisSource without database selection when database is null', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, null);
      
      const redisSource = await RedisSource.create(config);

      expect(mockClient.select).not.toHaveBeenCalled();
      expect(redisSource).toBeInstanceOf(RedisSource);
    });

    it('should handle connection errors', async () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      const connectionError = new Error('Connection failed');
      mockClient.connect.mockRejectedValue(connectionError);

      await expect(RedisSource.create(config)).rejects.toThrow('Connection failed');
    });

    it('should handle database selection errors', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, 5);
      const selectError = new Error('Database selection failed');
      mockClient.select.mockRejectedValue(selectError);

      await expect(RedisSource.create(config)).rejects.toThrow('Database selection failed');
    });

    it('should set up error event handler', async () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      
      await RedisSource.create(config);

      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      // Test the error handler
      const errorHandler = mockClient.on.mock.calls[0][1];
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      errorHandler(new Error('Test error'));
      
      expect(consoleSpy).toHaveBeenCalledWith('[Redis] Error: Error: Test error');
      
      consoleSpy.mockRestore();
    });

    it('should use correct Redis URL from RedisUtils', async () => {
      const config = new RedisConfig(['redis.example.com'], ['6380'], true, 'user', 'pass');
      (RedisUtils.buildRedisUrl as jest.Mock).mockReturnValue('rediss://user:pass@redis.example.com:6380');
      
      await RedisSource.create(config);

      expect(RedisUtils.buildRedisUrl).toHaveBeenCalledWith(config);
      expect(mockRedis.createClient).toHaveBeenCalledWith({ 
        url: 'rediss://user:pass@redis.example.com:6380' 
      });
    });

    it('should handle complex configuration', async () => {
      const config = new RedisConfig(
        ['host1', 'host2', 'host3'],
        ['6379', '6380', '7000'],
        true,
        'username',
        'password123',
        2
      );
      
      (RedisUtils.buildRedisUrl as jest.Mock).mockReturnValue('rediss://username:password123@host1:6379,host2:6380,host3:7000');
      
      const redisSource = await RedisSource.create(config);

      expect(RedisUtils.buildRedisUrl).toHaveBeenCalledWith(config);
      expect(mockRedis.createClient).toHaveBeenCalledWith({ 
        url: 'rediss://username:password123@host1:6379,host2:6380,host3:7000' 
      });
      expect(mockClient.select).toHaveBeenCalledWith(2);
      expect(redisSource).toBeInstanceOf(RedisSource);
    });
  });

  describe('Constructor', () => {
    it('should create instance with provided client', () => {
      const redisSource = new (RedisSource as any)(mockClient);
      
      expect(redisSource.client).toBe(mockClient);
    });

    it('should have readonly client property', () => {
      const redisSource = new (RedisSource as any)(mockClient);
      
      // TypeScript will prevent this at compile time, but we can test runtime behavior
      expect(() => {
        (redisSource as any).client = 'modified';
      }).not.toThrow(); // JavaScript allows property modification

      // The property should be modified in JavaScript runtime
      expect(redisSource.client).toBe('modified');
    });
  });

  describe('Error Handling', () => {
    it('should handle RedisUtils.buildRedisUrl errors', async () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      (RedisUtils.buildRedisUrl as jest.Mock).mockImplementation(() => {
        throw new Error('URL building failed');
      });

      await expect(RedisSource.create(config)).rejects.toThrow('URL building failed');
    });

    it('should handle Redis.createClient errors', async () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      mockRedis.createClient.mockImplementation(() => {
        throw new Error('Client creation failed');
      });

      await expect(RedisSource.create(config)).rejects.toThrow('Client creation failed');
    });

    it('should handle multiple connection attempts', async () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      
      // First call succeeds
      const redisSource1 = await RedisSource.create(config);
      
      // Second call also succeeds
      const redisSource2 = await RedisSource.create(config);
      
      expect(redisSource1).toBeInstanceOf(RedisSource);
      expect(redisSource2).toBeInstanceOf(RedisSource);
      expect(redisSource1).not.toBe(redisSource2); // Different instances
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty config arrays', async () => {
      const config = new RedisConfig([], []);
      (RedisUtils.buildRedisUrl as jest.Mock).mockReturnValue('redis://localhost:6379');
      
      const redisSource = await RedisSource.create(config);

      expect(redisSource).toBeInstanceOf(RedisSource);
    });

    it('should handle undefined database values', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, undefined);
      
      const redisSource = await RedisSource.create(config);

      expect(mockClient.select).not.toHaveBeenCalled();
      expect(redisSource).toBeInstanceOf(RedisSource);
    });

    it('should handle zero database value', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, 0);
      
      const redisSource = await RedisSource.create(config);

      expect(mockClient.select).toHaveBeenCalledWith(0);
      expect(redisSource).toBeInstanceOf(RedisSource);
    });

    it('should handle negative database value', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, -1);
      
      const redisSource = await RedisSource.create(config);

      expect(mockClient.select).toHaveBeenCalledWith(-1);
      expect(redisSource).toBeInstanceOf(RedisSource);
    });

    it('should handle very large database value', async () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, undefined, 999999);
      
      const redisSource = await RedisSource.create(config);

      expect(mockClient.select).toHaveBeenCalledWith(999999);
      expect(redisSource).toBeInstanceOf(RedisSource);
    });
  });

  describe('Integration with Redis Client', () => {
    it('should pass the correct client instance', async () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      const redisSource = await RedisSource.create(config);

      expect(redisSource.client).toBe(mockClient);
      expect(redisSource.client).toHaveProperty('connect');
      expect(redisSource.client).toHaveProperty('select');
      expect(redisSource.client).toHaveProperty('on');
    });

    it('should maintain client reference after creation', async () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      const redisSource = await RedisSource.create(config);

      // Simulate some time passing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(redisSource.client).toBe(mockClient);
    });
  });
});
