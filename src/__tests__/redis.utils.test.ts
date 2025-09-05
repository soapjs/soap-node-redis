import { RedisUtils } from '../redis.utils';
import { RedisConfig } from '../redis.config';

describe('RedisUtils Unit Tests', () => {
  describe('buildRedisUrl() method', () => {
    it('should build basic Redis URL without authentication', () => {
      const config = new RedisConfig(['localhost'], ['6379']);
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://localhost:6379');
    });

    it('should build Redis URL with multiple hosts and ports', () => {
      const config = new RedisConfig(
        ['localhost', '127.0.0.1', 'redis.example.com'],
        ['6379', '6380', '7000']
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://localhost:6379,127.0.0.1:6380,redis.example.com:7000');
    });

    it('should build Redis URL with password only', () => {
      const config = new RedisConfig(['localhost'], ['6379'], false, undefined, 'password123');
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://default:password123@localhost:6379');
    });

    it('should build Redis URL with user and password', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379'],
        false,
        'myuser',
        'password123'
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://myuser:password123@localhost:6379');
    });

    it('should build Redis URL with IANA protocol (rediss)', () => {
      const config = new RedisConfig(['localhost'], ['6379'], true);
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('rediss://localhost:6379');
    });

    it('should build Redis URL with IANA protocol and authentication', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379'],
        true,
        'user',
        'pass'
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('rediss://user:pass@localhost:6379');
    });

    it('should handle empty hosts array by using localhost', () => {
      const config = new RedisConfig([], ['6379']);
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://localhost:6379');
    });

    it('should handle empty ports array by using 6379', () => {
      const config = new RedisConfig(['localhost'], []);
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://localhost:6379');
    });

    it('should handle more hosts than ports by repeating the first port', () => {
      const config = new RedisConfig(
        ['host1', 'host2', 'host3'],
        ['6379', '6380']
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://host1:6379,host2:6380,host3:6379');
    });

    it('should handle single host with multiple ports', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379', '6380', '7000']
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://localhost:6379');
    });

    it('should handle special characters in hostnames', () => {
      const config = new RedisConfig(
        ['redis-cluster.example.com', 'redis-2.example.com'],
        ['6379', '6380']
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://redis-cluster.example.com:6379,redis-2.example.com:6380');
    });

    it('should handle special characters in credentials', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379'],
        false,
        'user@domain.com',
        'p@ssw0rd!@#'
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://user@domain.com:p@ssw0rd!@#@localhost:6379');
    });

    it('should handle empty config with all defaults', () => {
      const config = new RedisConfig([], []);
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://localhost:6379');
    });

    it('should ignore database parameter in URL construction', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379'],
        false,
        'user',
        'pass',
        'mydb'
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://user:pass@localhost:6379');
      expect(url).not.toContain('mydb');
    });
  });

  describe('convertStringToQueryArray() method', () => {
    it('should convert simple space-separated query to array', () => {
      const query = 'SELECT * FROM users WHERE id = 1';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['SELECT', '*', 'FROM', 'users', 'WHERE', 'id', '=', '1']);
    });

    it('should handle quoted strings correctly', () => {
      const query = 'SELECT "user name" FROM users WHERE status = "active"';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['SELECT', 'user name', 'FROM', 'users', 'WHERE', 'status', '=', 'active']);
    });

    it('should handle mixed quoted and unquoted strings', () => {
      const query = 'SET key "value with spaces" EX 3600';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['SET', 'key', 'value with spaces', 'EX', '3600']);
    });

    it('should handle empty string', () => {
      const query = '';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual([]);
    });

    it('should handle string with only spaces', () => {
      const query = '   ';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual([]);
    });

    it('should handle single word', () => {
      const query = 'PING';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['PING']);
    });

    it('should handle single quoted word', () => {
      const query = '"hello world"';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['hello world']);
    });

    it('should handle multiple consecutive spaces', () => {
      const query = 'SELECT    *    FROM    users';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['SELECT', '*', 'FROM', 'users']);
    });

    it('should handle tabs and newlines', () => {
      const query = 'SELECT\t*\nFROM\tusers';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['SELECT', '*', 'FROM', 'users']);
    });

    it('should handle complex Redis command with multiple quoted values', () => {
      const query = 'HSET user:123 "first name" "John" "last name" "Doe" email "john@example.com"';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual([
        'HSET',
        'user:123',
        'first name',
        'John',
        'last name',
        'Doe',
        'email',
        'john@example.com'
      ]);
    });

    it('should handle empty quoted strings', () => {
      const query = 'SET key ""';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['SET', 'key', '']);
    });

    it('should handle special characters in quoted strings', () => {
      const query = 'SET "key with special chars !@#$%^&*()" "value with \'quotes\'"';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['SET', 'key with special chars !@#$%^&*()', 'value with \'quotes\'']);
    });

    it('should handle malformed quotes gracefully', () => {
      const query = 'SET "unclosed quote value';
      const result = RedisUtils.convertStringToQueryArray(query);

      // The regex should still work and return what it can parse
      expect(result).toEqual(['SET', 'unclosed', 'quote', 'value']);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined values in config gracefully', () => {
      const config = new RedisConfig(
        ['localhost'],
        ['6379'],
        undefined,
        undefined,
        undefined,
        undefined
      );
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe('redis://localhost:6379');
    });

    it('should handle very long hostnames', () => {
      const longHostname = 'a'.repeat(100) + '.example.com';
      const config = new RedisConfig([longHostname], ['6379']);
      const url = RedisUtils.buildRedisUrl(config);

      expect(url).toBe(`redis://${longHostname}:6379`);
    });

    it('should handle very long query strings', () => {
      const longQuery = 'SELECT ' + 'field' + ', '.repeat(1000) + 'FROM table';
      const result = RedisUtils.convertStringToQueryArray(longQuery);

      expect(result.length).toBeGreaterThan(1000);
      expect(result[0]).toBe('SELECT');
      expect(result[result.length - 2]).toBe('FROM');
      expect(result[result.length - 1]).toBe('table');
    });

    it('should handle query with only quotes', () => {
      const query = '""';
      const result = RedisUtils.convertStringToQueryArray(query);

      expect(result).toEqual(['']);
    });

    it('should handle query with mixed quote types', () => {
      const query = 'SET "double quotes" \'single quotes\' normal';
      const result = RedisUtils.convertStringToQueryArray(query);

      // Note: The current implementation only handles double quotes
      expect(result).toEqual(['SET', 'double quotes', "'single", "quotes'", 'normal']);
    });
  });
});
