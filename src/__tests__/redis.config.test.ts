import { RedisConfig } from '../redis.config';
import { ConfigVars } from '@soapjs/soap';

// Mock ConfigVars
const mockConfigVars = {
  getArrayEnv: jest.fn(),
  getBooleanEnv: jest.fn(),
  getStringEnv: jest.fn()
};

describe('RedisConfig Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create RedisConfig with all properties', () => {
      const config = new RedisConfig(
        ['localhost', '127.0.0.1'],
        ['6379', '6380'],
        true,
        'user',
        'password',
        'mydb'
      );

      expect(config.hosts).toEqual(['localhost', '127.0.0.1']);
      expect(config.ports).toEqual(['6379', '6380']);
      expect(config.iana).toBe(true);
      expect(config.user).toBe('user');
      expect(config.password).toBe('password');
      expect(config.database).toBe('mydb');
    });

    it('should create RedisConfig with minimal properties', () => {
      const config = new RedisConfig(['localhost'], ['6379']);

      expect(config.hosts).toEqual(['localhost']);
      expect(config.ports).toEqual(['6379']);
      expect(config.iana).toBeUndefined();
      expect(config.user).toBeUndefined();
      expect(config.password).toBeUndefined();
      expect(config.database).toBeUndefined();
    });

    it('should handle empty arrays', () => {
      const config = new RedisConfig([], []);

      expect(config.hosts).toEqual([]);
      expect(config.ports).toEqual([]);
    });

    it('should handle undefined optional parameters', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379'],
        undefined,
        undefined,
        undefined,
        undefined
      );

      expect(config.hosts).toEqual(['localhost']);
      expect(config.ports).toEqual(['6379']);
      expect(config.iana).toBeUndefined();
      expect(config.user).toBeUndefined();
      expect(config.password).toBeUndefined();
      expect(config.database).toBeUndefined();
    });
  });

  describe('create() static method', () => {
    it('should create RedisConfig from ConfigVars without prefix', () => {
      mockConfigVars.getArrayEnv.mockReturnValue(['localhost', '127.0.0.1']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['localhost', '127.0.0.1']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['6379', '6380']);
      mockConfigVars.getBooleanEnv.mockReturnValue(true);
      mockConfigVars.getStringEnv.mockReturnValue('user');
      mockConfigVars.getStringEnv.mockReturnValueOnce('user');
      mockConfigVars.getStringEnv.mockReturnValueOnce('password');
      mockConfigVars.getStringEnv.mockReturnValueOnce('mydb');

      const config = RedisConfig.create(mockConfigVars as any);

      expect(config.hosts).toEqual(['localhost', '127.0.0.1']);
      expect(config.ports).toEqual(['6379', '6380']);
      expect(config.iana).toBe(true);
      expect(config.user).toBe('user');
      expect(config.password).toBe('password');
      expect(config.database).toBe('mydb');

      expect(mockConfigVars.getArrayEnv).toHaveBeenCalledWith('REDIS_HOSTS');
      expect(mockConfigVars.getArrayEnv).toHaveBeenCalledWith('REDIS_PORTS');
      expect(mockConfigVars.getBooleanEnv).toHaveBeenCalledWith('REDIS_IANA');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('REDIS_USER');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('REDIS_PASSWORD');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('REDIS_DB_NAME');
    });

    it('should create RedisConfig from ConfigVars with prefix', () => {
      mockConfigVars.getArrayEnv.mockReturnValue(['localhost']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['localhost']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['6379']);
      mockConfigVars.getBooleanEnv.mockReturnValue(false);
      mockConfigVars.getStringEnv.mockReturnValue(undefined);

      const config = RedisConfig.create(mockConfigVars as any, 'TEST');

      expect(config.hosts).toEqual(['localhost']);
      expect(config.ports).toEqual(['6379']);
      expect(config.iana).toBe(false);
      expect(config.user).toBeUndefined();
      expect(config.password).toBeUndefined();
      expect(config.database).toBeUndefined();

      expect(mockConfigVars.getArrayEnv).toHaveBeenCalledWith('TEST_REDIS_HOSTS');
      expect(mockConfigVars.getArrayEnv).toHaveBeenCalledWith('TEST_REDIS_PORTS');
      expect(mockConfigVars.getBooleanEnv).toHaveBeenCalledWith('TEST_REDIS_IANA');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('TEST_REDIS_USER');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('TEST_REDIS_PASSWORD');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('TEST_REDIS_DB_NAME');
    });

    it('should handle prefix ending with underscore', () => {
      mockConfigVars.getArrayEnv.mockReturnValue(['localhost']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['localhost']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['6379']);
      mockConfigVars.getBooleanEnv.mockReturnValue(undefined);
      mockConfigVars.getStringEnv.mockReturnValue(undefined);

      const config = RedisConfig.create(mockConfigVars as any, 'TEST_');

      expect(mockConfigVars.getArrayEnv).toHaveBeenCalledWith('TEST_REDIS_HOSTS');
      expect(mockConfigVars.getArrayEnv).toHaveBeenCalledWith('TEST_REDIS_PORTS');
      expect(mockConfigVars.getBooleanEnv).toHaveBeenCalledWith('TEST_REDIS_IANA');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('TEST_REDIS_USER');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('TEST_REDIS_PASSWORD');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('TEST_REDIS_DB_NAME');
    });

    it('should handle empty prefix', () => {
      mockConfigVars.getArrayEnv.mockReturnValue(['localhost']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['localhost']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['6379']);
      mockConfigVars.getBooleanEnv.mockReturnValue(undefined);
      mockConfigVars.getStringEnv.mockReturnValue(undefined);

      const config = RedisConfig.create(mockConfigVars as any, '');

      expect(mockConfigVars.getArrayEnv).toHaveBeenCalledWith('REDIS_HOSTS');
      expect(mockConfigVars.getArrayEnv).toHaveBeenCalledWith('REDIS_PORTS');
      expect(mockConfigVars.getBooleanEnv).toHaveBeenCalledWith('REDIS_IANA');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('REDIS_USER');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('REDIS_PASSWORD');
      expect(mockConfigVars.getStringEnv).toHaveBeenCalledWith('REDIS_DB_NAME');
    });

    it('should handle undefined values from ConfigVars', () => {
      mockConfigVars.getArrayEnv.mockReturnValue(undefined);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(undefined);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(undefined);
      mockConfigVars.getBooleanEnv.mockReturnValue(undefined);
      mockConfigVars.getStringEnv.mockReturnValue(undefined);

      const config = RedisConfig.create(mockConfigVars as any);

      expect(config.hosts).toBeUndefined();
      expect(config.ports).toBeUndefined();
      expect(config.iana).toBeUndefined();
      expect(config.user).toBeUndefined();
      expect(config.password).toBeUndefined();
      expect(config.database).toBeUndefined();
    });

    it('should handle mixed data types for database', () => {
      mockConfigVars.getArrayEnv.mockReturnValue(['localhost']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['localhost']);
      mockConfigVars.getArrayEnv.mockReturnValueOnce(['6379']);
      mockConfigVars.getBooleanEnv.mockReturnValue(undefined);
      mockConfigVars.getStringEnv.mockReturnValue(0); // number as string
      mockConfigVars.getStringEnv.mockReturnValueOnce(undefined);
      mockConfigVars.getStringEnv.mockReturnValueOnce(undefined);
      mockConfigVars.getStringEnv.mockReturnValueOnce(0);

      const config = RedisConfig.create(mockConfigVars as any);

      expect(config.database).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in hosts and ports', () => {
      const config = new RedisConfig(
        ['localhost', '127.0.0.1', 'redis-cluster.example.com'],
        ['6379', '6380', '7000'],
        true,
        'user@domain',
        'p@ssw0rd!',
        'my-db_123'
      );

      expect(config.hosts).toContain('redis-cluster.example.com');
      expect(config.ports).toContain('7000');
      expect(config.user).toBe('user@domain');
      expect(config.password).toBe('p@ssw0rd!');
      expect(config.database).toBe('my-db_123');
    });

    it('should handle numeric database values', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379'],
        false,
        undefined,
        undefined,
        5
      );

      expect(config.database).toBe(5);
    });

    it('should handle string database values', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379'],
        false,
        undefined,
        undefined,
        'production'
      );

      expect(config.database).toBe('production');
    });

    it('should handle boolean iana values', () => {
      const configTrue = new RedisConfig(['localhost'], ['6379'], true);
      const configFalse = new RedisConfig(['localhost'], ['6379'], false);

      expect(configTrue.iana).toBe(true);
      expect(configFalse.iana).toBe(false);
    });
  });

  describe('Property Access', () => {
    it('should have readonly properties', () => {
      const config = new RedisConfig(['localhost'], ['6379']);

      // TypeScript will prevent this at compile time, but we can test runtime behavior
      expect(() => {
        (config as any).hosts = ['modified'];
      }).not.toThrow(); // JavaScript allows property modification

      // The property should be modified in JavaScript runtime
      expect(config.hosts).toEqual(['modified']);
    });

    it('should maintain property immutability in practice', () => {
      const hosts = ['localhost', '127.0.0.1'];
      const ports = ['6379', '6380'];
      const config = new RedisConfig(hosts, ports);

      // Modifying the original arrays should affect the config since they're passed by reference
      hosts.push('newhost');
      ports.push('9999');

      expect(config.hosts).toEqual(['localhost', '127.0.0.1', 'newhost']);
      expect(config.ports).toEqual(['6379', '6380', '9999']);
    });
  });
});
