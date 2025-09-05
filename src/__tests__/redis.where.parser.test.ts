import { RedisWhereParser } from '../redis.where.parser';
import { Where, Condition, VariedCondition, NestedCondition } from '@soapjs/soap';

// Mock the Where class
class MockWhere {
  constructor(private conditions: any) {}
  build() {
    return this.conditions;
  }
}

describe('RedisWhereParser Unit Tests', () => {
  describe('parse() method', () => {
    it('should return "*" for null input', () => {
      const result = RedisWhereParser.parse(null);
      expect(result).toBe('*');
    });

    it('should return "*" for undefined input', () => {
      const result = RedisWhereParser.parse(undefined as any);
      expect(result).toBe('*');
    });

    it('should handle Where object by calling build()', () => {
      const mockWhere = {
        build: () => ({ left: 'field', operator: 'eq', right: 'value' })
      };
      // Mock the instanceof check
      Object.setPrototypeOf(mockWhere, Where.prototype);
      const result = RedisWhereParser.parse(mockWhere as any);

      // The mock Where object should call build() and return the condition
      expect(result).toBe('@field:{value}');
    });

    it('should throw error for invalid condition format', () => {
      const invalidCondition = { someProperty: 'value' };
      
      expect(() => {
        RedisWhereParser.parse(invalidCondition as any);
      }).toThrow('Invalid condition format');
    });
  });

  describe('parseSimpleCondition() method', () => {
    it('should parse eq condition', () => {
      const condition: Condition = {
        left: 'name',
        operator: 'eq',
        right: 'John'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@name:{John}');
    });

    it('should parse ne condition', () => {
      const condition: Condition = {
        left: 'status',
        operator: 'ne',
        right: 'inactive'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('-@status:{inactive}');
    });

    it('should parse gt condition', () => {
      const condition: Condition = {
        left: 'age',
        operator: 'gt',
        right: '18'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@age:[(18 +inf]');
    });

    it('should parse lt condition', () => {
      const condition: Condition = {
        left: 'price',
        operator: 'lt',
        right: '100'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@price:[-inf (100)]');
    });

    it('should parse gte condition', () => {
      const condition: Condition = {
        left: 'score',
        operator: 'gte',
        right: '80'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@score:[80 +inf]');
    });

    it('should parse lte condition', () => {
      const condition: Condition = {
        left: 'count',
        operator: 'lte',
        right: '50'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@count:[-inf 50]');
    });

    it('should parse in condition', () => {
      const condition: Condition = {
        left: 'category',
        operator: 'in',
        right: ['electronics', 'books', 'clothing']
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@category:{electronics} | @category:{books} | @category:{clothing}');
    });

    it('should parse nin condition', () => {
      const condition: Condition = {
        left: 'status',
        operator: 'nin',
        right: ['deleted', 'archived']
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('-@status:{deleted} -@status:{archived}');
    });

    it('should parse like condition', () => {
      const condition: Condition = {
        left: 'title',
        operator: 'like',
        right: 'test'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@title:/.*test.*/');
    });

    it('should throw error for unsupported operator', () => {
      const condition: Condition = {
        left: 'field',
        operator: 'unsupported' as any,
        right: 'value'
      };

      expect(() => {
        RedisWhereParser.parse(condition);
      }).toThrow('Unsupported operator unsupported');
    });

    it('should handle special characters in field names and values', () => {
      const condition: Condition = {
        left: 'field-name_with.special',
        operator: 'eq',
        right: 'value with spaces & special chars!'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@field-name_with.special:{value with spaces & special chars!}');
    });

    it('should handle numeric values', () => {
      const condition: Condition = {
        left: 'id',
        operator: 'eq',
        right: 123
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@id:{123}');
    });

    it('should handle boolean values', () => {
      const condition: Condition = {
        left: 'active',
        operator: 'eq',
        right: true
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@active:{true}');
    });
  });

  describe('parseNestedCondition() method', () => {
    it('should parse AND condition', () => {
      const condition: VariedCondition = {
        conditions: [
          { left: 'name', operator: 'eq', right: 'John' },
          { left: 'age', operator: 'gte', right: '18' }
        ],
        operator: 'and'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('(@name:{John} AND @age:[18 +inf])');
    });

    it('should parse OR condition', () => {
      const condition: VariedCondition = {
        conditions: [
          { left: 'status', operator: 'eq', right: 'active' },
          { left: 'status', operator: 'eq', right: 'pending' }
        ],
        operator: 'or'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('(@status:{active} OR @status:{pending})');
    });

    it('should parse complex nested conditions', () => {
      const condition: VariedCondition = {
        conditions: [
          { left: 'name', operator: 'eq', right: 'John' },
          {
            conditions: [
              { left: 'age', operator: 'gte', right: '18' },
              { left: 'age', operator: 'lt', right: '65' }
            ],
            operator: 'and'
          }
        ],
        operator: 'and'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('(@name:{John} AND (@age:[18 +inf] AND @age:[-inf (65)]))');
    });

    it('should handle single condition in nested structure', () => {
      const condition: VariedCondition = {
        conditions: [
          { left: 'id', operator: 'eq', right: '1' }
        ],
        operator: 'and'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('(@id:{1})');
    });

    it('should handle empty conditions array', () => {
      const condition: VariedCondition = {
        conditions: [],
        operator: 'and'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('()');
    });
  });

  describe('NestedCondition handling', () => {
    it('should handle NestedCondition with result property', () => {
      const nestedCondition: NestedCondition = {
        result: { left: 'field', operator: 'eq', right: 'value' }
      };
      const result = RedisWhereParser.parse(nestedCondition);

      expect(result).toBe('@field:{value}');
    });

    it('should handle NestedCondition with nested result', () => {
      const nestedCondition: NestedCondition = {
        result: {
          conditions: [
            { left: 'a', operator: 'eq', right: '1' },
            { left: 'b', operator: 'eq', right: '2' }
          ],
          operator: 'and'
        }
      };
      const result = RedisWhereParser.parse(nestedCondition);

      expect(result).toBe('(@a:{1} AND @b:{2})');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty string values', () => {
      const condition: Condition = {
        left: 'description',
        operator: 'eq',
        right: ''
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@description:{}');
    });

    it('should handle null values', () => {
      const condition: Condition = {
        left: 'optional_field',
        operator: 'eq',
        right: null
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@optional_field:{null}');
    });

    it('should handle very long field names', () => {
      const longFieldName = 'a'.repeat(1000);
      const condition: Condition = {
        left: longFieldName,
        operator: 'eq',
        right: 'value'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe(`@${longFieldName}:{value}`);
    });

    it('should handle very long values', () => {
      const longValue = 'a'.repeat(1000);
      const condition: Condition = {
        left: 'field',
        operator: 'eq',
        right: longValue
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe(`@field:{${longValue}}`);
    });

    it('should handle special regex characters in like condition', () => {
      const condition: Condition = {
        left: 'pattern',
        operator: 'like',
        right: 'test[0-9]+.*'
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@pattern:/.*test[0-9]+.*.*/');
    });

    it('should handle empty array in in condition', () => {
      const condition: Condition = {
        left: 'field',
        operator: 'in',
        right: []
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('');
    });

    it('should handle single item array in in condition', () => {
      const condition: Condition = {
        left: 'field',
        operator: 'in',
        right: ['single']
      };
      const result = RedisWhereParser.parse(condition);

      expect(result).toBe('@field:{single}');
    });

    it('should handle deeply nested conditions', () => {
      const deeplyNested: VariedCondition = {
        conditions: [
          {
            conditions: [
              {
                conditions: [
                  { left: 'a', operator: 'eq', right: '1' },
                  { left: 'b', operator: 'eq', right: '2' }
                ],
                operator: 'and'
              },
              { left: 'c', operator: 'eq', right: '3' }
            ],
            operator: 'or'
          }
        ],
        operator: 'and'
      };
      const result = RedisWhereParser.parse(deeplyNested);

      expect(result).toBe('(((@a:{1} AND @b:{2}) OR @c:{3}))');
    });
  });
});
