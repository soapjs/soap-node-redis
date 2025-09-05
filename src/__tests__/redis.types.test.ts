import { RedisSortedDocument, RedisHashDocument, RedisFindQueryParams, RedisRemoveQueryParams, RedisListQueryParams } from '../redis.types';
import { Order } from '@soapjs/soap';

describe('Redis Types Unit Tests', () => {
  describe('RedisSortedDocument', () => {
    it('should create valid RedisSortedDocument with number score', () => {
      const doc: RedisSortedDocument = {
        member: 'user1',
        score: 100
      };

      expect(doc.member).toBe('user1');
      expect(doc.score).toBe(100);
      expect(typeof doc.score).toBe('number');
    });

    it('should create valid RedisSortedDocument with decimal score', () => {
      const doc: RedisSortedDocument = {
        member: 'user2',
        score: 99.5
      };

      expect(doc.member).toBe('user2');
      expect(doc.score).toBe(99.5);
    });

    it('should create valid RedisSortedDocument with negative score', () => {
      const doc: RedisSortedDocument = {
        member: 'user3',
        score: -10
      };

      expect(doc.member).toBe('user3');
      expect(doc.score).toBe(-10);
    });

    it('should create valid RedisSortedDocument with zero score', () => {
      const doc: RedisSortedDocument = {
        member: 'user4',
        score: 0
      };

      expect(doc.member).toBe('user4');
      expect(doc.score).toBe(0);
    });

    it('should handle special characters in member', () => {
      const doc: RedisSortedDocument = {
        member: 'user:with:colons',
        score: 50
      };

      expect(doc.member).toBe('user:with:colons');
    });

    it('should handle empty string member', () => {
      const doc: RedisSortedDocument = {
        member: '',
        score: 1
      };

      expect(doc.member).toBe('');
    });

    it('should handle very large score values', () => {
      const doc: RedisSortedDocument = {
        member: 'user5',
        score: Number.MAX_SAFE_INTEGER
      };

      expect(doc.score).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very small score values', () => {
      const doc: RedisSortedDocument = {
        member: 'user6',
        score: Number.MIN_SAFE_INTEGER
      };

      expect(doc.score).toBe(Number.MIN_SAFE_INTEGER);
    });
  });

  describe('RedisHashDocument', () => {
    it('should create valid RedisHashDocument with string values', () => {
      const doc: RedisHashDocument = {
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active'
      };

      expect(doc.name).toBe('John Doe');
      expect(doc.email).toBe('john@example.com');
      expect(doc.status).toBe('active');
    });

    it('should create valid RedisHashDocument with number values', () => {
      const doc: RedisHashDocument = {
        id: 123,
        age: 30,
        score: 95.5
      };

      expect(doc.id).toBe(123);
      expect(doc.age).toBe(30);
      expect(doc.score).toBe(95.5);
    });

    it('should create valid RedisHashDocument with boolean values', () => {
      const doc: RedisHashDocument = {
        active: true,
        verified: false,
        premium: true
      };

      expect(doc.active).toBe(true);
      expect(doc.verified).toBe(false);
      expect(doc.premium).toBe(true);
    });

    it('should create valid RedisHashDocument with object values', () => {
      const doc: RedisHashDocument = {
        profile: { name: 'John', age: 30 },
        settings: { theme: 'dark', notifications: true },
        metadata: { created: '2024-01-01', updated: '2024-01-02' }
      };

      expect(doc.profile).toEqual({ name: 'John', age: 30 });
      expect(doc.settings).toEqual({ theme: 'dark', notifications: true });
      expect(doc.metadata).toEqual({ created: '2024-01-01', updated: '2024-01-02' });
    });

    it('should create valid RedisHashDocument with Buffer values', () => {
      const buffer = Buffer.from('test data');
      const doc: RedisHashDocument = {
        data: buffer,
        binary: Buffer.from([1, 2, 3, 4])
      };

      expect(doc.data).toBe(buffer);
      expect(doc.binary).toEqual(Buffer.from([1, 2, 3, 4]));
    });

    it('should create valid RedisHashDocument with mixed types', () => {
      const doc: RedisHashDocument = {
        id: 1,
        name: 'John',
        active: true,
        profile: { age: 30 },
        data: Buffer.from('test'),
        score: 95.5
      };

      expect(doc.id).toBe(1);
      expect(doc.name).toBe('John');
      expect(doc.active).toBe(true);
      expect(doc.profile).toEqual({ age: 30 });
      expect(doc.data).toEqual(Buffer.from('test'));
      expect(doc.score).toBe(95.5);
    });

    it('should handle special characters in keys', () => {
      const doc: RedisHashDocument = {
        'key:with:colons': 'value1',
        'key-with-dashes': 'value2',
        'key_with_underscores': 'value3',
        'key with spaces': 'value4'
      };

      expect(doc['key:with:colons']).toBe('value1');
      expect(doc['key-with-dashes']).toBe('value2');
      expect(doc['key_with_underscores']).toBe('value3');
      expect(doc['key with spaces']).toBe('value4');
    });

    it('should handle empty values', () => {
      const doc: RedisHashDocument = {
        emptyString: '',
        zeroNumber: 0,
        falseBoolean: false,
        emptyObject: {},
        emptyBuffer: Buffer.alloc(0)
      };

      expect(doc.emptyString).toBe('');
      expect(doc.zeroNumber).toBe(0);
      expect(doc.falseBoolean).toBe(false);
      expect(doc.emptyObject).toEqual({});
      expect(doc.emptyBuffer).toEqual(Buffer.alloc(0));
    });

    it('should handle null and undefined values', () => {
      const doc: RedisHashDocument = {
        nullValue: null as any,
        undefinedValue: undefined as any
      };

      expect(doc.nullValue).toBeNull();
      expect(doc.undefinedValue).toBeUndefined();
    });
  });

  describe('RedisFindQueryParams', () => {
    it('should create valid RedisFindQueryParams array', () => {
      const params: RedisFindQueryParams = ['SELECT', '*', 'FROM', 'users', 'WHERE', 'id', '=', '1'];

      expect(Array.isArray(params)).toBe(true);
      expect(params).toEqual(['SELECT', '*', 'FROM', 'users', 'WHERE', 'id', '=', '1']);
    });

    it('should handle empty array', () => {
      const params: RedisFindQueryParams = [];

      expect(params).toEqual([]);
    });

    it('should handle single element array', () => {
      const params: RedisFindQueryParams = ['PING'];

      expect(params).toEqual(['PING']);
    });

    it('should handle complex query array', () => {
      const params: RedisFindQueryParams = [
        'FT.SEARCH',
        'indexName',
        '@name:{John}',
        'SORTBY',
        'age',
        'DESC',
        'LIMIT',
        '0',
        '10'
      ];

      expect(params).toHaveLength(9);
      expect(params[0]).toBe('FT.SEARCH');
      expect(params[1]).toBe('indexName');
      expect(params[2]).toBe('@name:{John}');
    });

    it('should handle special characters in query elements', () => {
      const params: RedisFindQueryParams = [
        'SET',
        'key:with:colons',
        'value with spaces',
        'EX',
        '3600'
      ];

      expect(params).toEqual(['SET', 'key:with:colons', 'value with spaces', 'EX', '3600']);
    });
  });

  describe('RedisRemoveQueryParams', () => {
    it('should create valid RedisRemoveQueryParams array', () => {
      const params: RedisRemoveQueryParams = ['DEL', 'key1', 'key2', 'key3'];

      expect(Array.isArray(params)).toBe(true);
      expect(params).toEqual(['DEL', 'key1', 'key2', 'key3']);
    });

    it('should handle single key removal', () => {
      const params: RedisRemoveQueryParams = ['DEL', 'single-key'];

      expect(params).toEqual(['DEL', 'single-key']);
    });

    it('should handle empty keys array', () => {
      const params: RedisRemoveQueryParams = ['DEL'];

      expect(params).toEqual(['DEL']);
    });

    it('should handle multiple keys with special characters', () => {
      const params: RedisRemoveQueryParams = [
        'DEL',
        'key:with:colons',
        'key with spaces',
        'key-with-dashes'
      ];

      expect(params).toEqual(['DEL', 'key:with:colons', 'key with spaces', 'key-with-dashes']);
    });
  });

  describe('RedisListQueryParams', () => {
    it('should create valid RedisListQueryParams with all properties', () => {
      const params: RedisListQueryParams = {
        offset: 10,
        limit: 20,
        order: Order.DESC
      };

      expect(params.offset).toBe(10);
      expect(params.limit).toBe(20);
      expect(params.order).toBe(Order.DESC);
    });

    it('should create valid RedisListQueryParams with ASC order', () => {
      const params: RedisListQueryParams = {
        offset: 0,
        limit: 10,
        order: Order.ASC
      };

      expect(params.offset).toBe(0);
      expect(params.limit).toBe(10);
      expect(params.order).toBe(Order.ASC);
    });

    it('should handle zero values', () => {
      const params: RedisListQueryParams = {
        offset: 0,
        limit: 0,
        order: Order.ASC
      };

      expect(params.offset).toBe(0);
      expect(params.limit).toBe(0);
      expect(params.order).toBe(Order.ASC);
    });

    it('should handle large values', () => {
      const params: RedisListQueryParams = {
        offset: 1000000,
        limit: 50000,
        order: Order.DESC
      };

      expect(params.offset).toBe(1000000);
      expect(params.limit).toBe(50000);
      expect(params.order).toBe(Order.DESC);
    });

    it('should handle negative offset', () => {
      const params: RedisListQueryParams = {
        offset: -10,
        limit: 20,
        order: Order.ASC
      };

      expect(params.offset).toBe(-10);
      expect(params.limit).toBe(20);
      expect(params.order).toBe(Order.ASC);
    });
  });

  describe('Type Compatibility', () => {
    it('should be compatible with array operations', () => {
      const findParams: RedisFindQueryParams = ['SELECT', '*'];
      const removeParams: RedisRemoveQueryParams = ['DEL', 'key'];

      expect(Array.isArray(findParams)).toBe(true);
      expect(Array.isArray(removeParams)).toBe(true);
      expect(findParams.length).toBe(2);
      expect(removeParams.length).toBe(2);
    });

    it('should support spread operator', () => {
      const findParams: RedisFindQueryParams = ['SELECT', '*', 'FROM', 'users'];
      const spreadParams = [...findParams, 'WHERE', 'id', '=', '1'];

      expect(spreadParams).toEqual(['SELECT', '*', 'FROM', 'users', 'WHERE', 'id', '=', '1']);
    });

    it('should support array methods', () => {
      const findParams: RedisFindQueryParams = ['SELECT', '*', 'FROM', 'users'];
      const filtered = findParams.filter(param => param !== 'SELECT');
      const mapped = findParams.map(param => param.toUpperCase());

      expect(filtered).toEqual(['*', 'FROM', 'users']);
      expect(mapped).toEqual(['SELECT', '*', 'FROM', 'USERS']);
    });

    it('should support object property access', () => {
      const listParams: RedisListQueryParams = {
        offset: 10,
        limit: 20,
        order: Order.DESC
      };

      expect(listParams.offset).toBe(10);
      expect(listParams.limit).toBe(20);
      expect(listParams.order).toBe(Order.DESC);
    });

    it('should support object destructuring', () => {
      const listParams: RedisListQueryParams = {
        offset: 5,
        limit: 15,
        order: Order.ASC
      };

      const { offset, limit, order } = listParams;

      expect(offset).toBe(5);
      expect(limit).toBe(15);
      expect(order).toBe(Order.ASC);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long member names in RedisSortedDocument', () => {
      const longMember = 'a'.repeat(1000);
      const doc: RedisSortedDocument = {
        member: longMember,
        score: 100
      };

      expect(doc.member).toBe(longMember);
      expect(doc.member.length).toBe(1000);
    });

    it('should handle very large arrays in query params', () => {
      const largeArray: RedisFindQueryParams = Array(1000).fill('element');
      
      expect(largeArray).toHaveLength(1000);
      expect(largeArray[0]).toBe('element');
      expect(largeArray[999]).toBe('element');
    });

    it('should handle nested objects in RedisHashDocument', () => {
      const doc: RedisHashDocument = {
        nested: {
          level1: {
            level2: {
              level3: {
                value: 'deep'
              }
            }
          }
        }
      };

      expect(doc.nested).toEqual({
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      });
    });

    it('should handle arrays as values in RedisHashDocument', () => {
      const doc: RedisHashDocument = {
        tags: ['tag1', 'tag2', 'tag3'],
        numbers: [1, 2, 3, 4, 5],
        booleans: [true, false, true]
      };

      expect(doc.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(doc.numbers).toEqual([1, 2, 3, 4, 5]);
      expect(doc.booleans).toEqual([true, false, true]);
    });
  });
});
