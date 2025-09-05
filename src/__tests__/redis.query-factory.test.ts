import { RedisQueryFactory } from '../redis.query-factory';
import { FindParams, CountParams, AggregationParams, Mapper } from '@soapjs/soap';

// Mock Mapper
class MockMapper implements Mapper {
  toModel(entity: any): any {
    return { ...entity, mapped: true };
  }

  toEntity(model: any): any {
    return { ...model, entity: true };
  }
}

describe('RedisQueryFactory Unit Tests', () => {
  let queryFactory: RedisQueryFactory;
  let mockMapper: MockMapper;

  beforeEach(() => {
    mockMapper = new MockMapper();
    queryFactory = new RedisQueryFactory(mockMapper);
  });

  describe('Constructor', () => {
    it('should create instance without mapper', () => {
      const factory = new RedisQueryFactory();
      expect(factory).toBeInstanceOf(RedisQueryFactory);
    });

    it('should create instance with mapper', () => {
      const factory = new RedisQueryFactory(mockMapper);
      expect(factory).toBeInstanceOf(RedisQueryFactory);
    });
  });

  describe('createFindQuery() method', () => {
    it('should create basic find query without parameters', () => {
      const params: FindParams = {};
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*']);
    });

    it('should create find query with where condition', () => {
      const params: FindParams = {
        where: { left: 'name', operator: 'eq', right: 'John' } as any
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '@name:{John}']);
    });

    it('should create find query with sort parameters', () => {
      const params: FindParams = {
        sort: { name: 1, age: -1 }
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual([
        'FT.SEARCH',
        'indexName',
        '*',
        'SORTBY',
        'name',
        'ASC',
        'SORTBY',
        'age',
        'DESC'
      ]);
    });

    it('should create find query with limit', () => {
      const params: FindParams = {
        limit: 10
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*', 'LIMIT', '0', '10']);
    });

    it('should create find query with limit and offset', () => {
      const params: FindParams = {
        limit: 10,
        offset: 20
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*', 'LIMIT', '20', '10']);
    });

    it('should create find query with all parameters', () => {
      const params: FindParams = {
        where: { left: 'status', operator: 'eq', right: 'active' } as any,
        sort: { name: 1 },
        limit: 5,
        offset: 10
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual([
        'FT.SEARCH',
        'indexName',
        '@status:{active}',
        'SORTBY',
        'name',
        'ASC',
        'LIMIT',
        '10',
        '5'
      ]);
    });

    it('should handle undefined limit', () => {
      const params: FindParams = {
        offset: 5
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*']);
    });

    it('should handle zero limit', () => {
      const params: FindParams = {
        limit: 0
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*', 'LIMIT', '0', '0']);
    });

    it('should handle complex sort with multiple fields', () => {
      const params: FindParams = {
        sort: {
          category: 1,
          price: -1,
          name: 1,
          created_at: -1
        }
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual([
        'FT.SEARCH',
        'indexName',
        '*',
        'SORTBY',
        'category',
        'ASC',
        'SORTBY',
        'price',
        'DESC',
        'SORTBY',
        'name',
        'ASC',
        'SORTBY',
        'created_at',
        'DESC'
      ]);
    });
  });

  describe('createCountQuery() method', () => {
    it('should create basic count query without where', () => {
      const params: CountParams = {};
      const result = queryFactory.createCountQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*', 'LIMIT', '0', '0']);
    });

    it('should create count query with where condition', () => {
      const params: CountParams = {
        where: { left: 'status', operator: 'eq', right: 'active' } as any
      };
      const result = queryFactory.createCountQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '@status:{active}', 'LIMIT', '0', '0']);
    });

    it('should handle complex where conditions', () => {
      const params: CountParams = {
        where: {
          conditions: [
            { left: 'age', operator: 'gte', right: '18' },
            { left: 'status', operator: 'eq', right: 'active' }
          ],
          operator: 'and'
        } as any
      };
      const result = queryFactory.createCountQuery(params);

      expect(result).toEqual([
        'FT.SEARCH',
        'indexName',
        '(@age:[18 +inf] AND @status:{active})',
        'LIMIT',
        '0',
        '0'
      ]);
    });
  });

  describe('createRemoveQuery() method', () => {
    it('should create remove query with single key', () => {
      const keys = ['key1'];
      const result = queryFactory.createRemoveQuery(keys);

      expect(result).toEqual(['DEL', 'key1']);
    });

    it('should create remove query with multiple keys', () => {
      const keys = ['key1', 'key2', 'key3'];
      const result = queryFactory.createRemoveQuery(keys);

      expect(result).toEqual(['DEL', 'key1', 'key2', 'key3']);
    });

    it('should create remove query with empty keys array', () => {
      const keys: string[] = [];
      const result = queryFactory.createRemoveQuery(keys);

      expect(result).toEqual(['DEL']);
    });

    it('should handle keys with special characters', () => {
      const keys = ['key:with:colons', 'key with spaces', 'key-with-dashes'];
      const result = queryFactory.createRemoveQuery(keys);

      expect(result).toEqual(['DEL', 'key:with:colons', 'key with spaces', 'key-with-dashes']);
    });
  });

  describe('createAggregationQuery() method', () => {
    it('should create basic aggregation query without parameters', () => {
      const params: AggregationParams = {};
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual(['FT.AGGREGATE', 'indexName', '*']);
    });

    it('should create aggregation query with where condition', () => {
      const params: AggregationParams = {
        where: { left: 'category', operator: 'eq', right: 'electronics' } as any
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual(['FT.AGGREGATE', 'indexName', '@category:{electronics}']);
    });

    it('should create aggregation query with groupBy only', () => {
      const params: AggregationParams = {
        groupBy: ['category', 'brand']
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"2"',
        'category',
        'brand'
      ]);
    });

    it('should create aggregation query with groupBy and count', () => {
      const params: AggregationParams = {
        groupBy: ['category'],
        count: 'field'
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"1"',
        'category',
        'REDUCE',
        'COUNT',
        '0',
        'AS',
        'count'
      ]);
    });

    it('should create aggregation query with groupBy and sum', () => {
      const params: AggregationParams = {
        groupBy: ['category'],
        sum: 'price'
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"1"',
        'category',
        'REDUCE',
        'SUM',
        '1',
        'price',
        'AS',
        'totalSum'
      ]);
    });

    it('should create aggregation query with groupBy and average', () => {
      const params: AggregationParams = {
        groupBy: ['category'],
        average: 'rating'
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"1"',
        'category',
        'REDUCE',
        'AVG',
        '1',
        'rating',
        'AS',
        'average'
      ]);
    });

    it('should create aggregation query with groupBy and min', () => {
      const params: AggregationParams = {
        groupBy: ['category'],
        min: 'price'
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"1"',
        'category',
        'REDUCE',
        'MIN',
        '1',
        'price',
        'AS',
        'min'
      ]);
    });

    it('should create aggregation query with groupBy and max', () => {
      const params: AggregationParams = {
        groupBy: ['category'],
        max: 'price'
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"1"',
        'category',
        'REDUCE',
        'MAX',
        '1',
        'price',
        'AS',
        'max'
      ]);
    });

    it('should create aggregation query with multiple reduce operations', () => {
      const params: AggregationParams = {
        groupBy: ['category'],
        count: 'field',
        sum: 'price',
        average: 'rating',
        min: 'price',
        max: 'price'
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"1"',
        'category',
        'REDUCE',
        'SUM',
        '1',
        'price',
        'AS',
        'totalSum',
        'REDUCE',
        'COUNT',
        '0',
        'AS',
        'count',
        'REDUCE',
        'AVG',
        '1',
        'rating',
        'AS',
        'average',
        'REDUCE',
        'MIN',
        '1',
        'price',
        'AS',
        'min',
        'REDUCE',
        'MAX',
        '1',
        'price',
        'AS',
        'max'
      ]);
    });

    it('should create aggregation query with sort', () => {
      const params: AggregationParams = {
        sort: { category: 1, count: -1 }
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'SORTBY',
        '1',
        'category',
        'ASC',
        'SORTBY',
        '1',
        'count',
        'DESC'
      ]);
    });

    it('should create complex aggregation query with all parameters', () => {
      const params: AggregationParams = {
        where: { left: 'status', operator: 'eq', right: 'active' } as any,
        groupBy: ['category', 'brand'],
        count: 'field',
        sum: 'price',
        sort: { category: 1 }
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '@status:{active}',
        'GROUPBY',
        '"2"',
        'category',
        'brand',
        'REDUCE',
        'SUM',
        '1',
        'price',
        'AS',
        'totalSum',
        'REDUCE',
        'COUNT',
        '0',
        'AS',
        'count',
        'SORTBY',
        '1',
        'category',
        'ASC'
      ]);
    });

    it('should handle empty groupBy array', () => {
      const params: AggregationParams = {
        groupBy: [],
        count: 'field'
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual(['FT.AGGREGATE', 'indexName', '*']);
    });

    it('should handle multiple groupBy fields', () => {
      const params: AggregationParams = {
        groupBy: ['category', 'brand', 'year', 'month']
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"4"',
        'category',
        'brand',
        'year',
        'month'
      ]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null where conditions', () => {
      const params: FindParams = {
        where: null as any
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*']);
    });

    it('should handle undefined sort', () => {
      const params: FindParams = {
        sort: undefined
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*']);
    });

    it('should handle very large limit values', () => {
      const params: FindParams = {
        limit: 1000000
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*', 'LIMIT', '0', '1000000']);
    });

    it('should handle negative offset', () => {
      const params: FindParams = {
        limit: 10,
        offset: -5
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual(['FT.SEARCH', 'indexName', '*', 'LIMIT', '-5', '10']);
    });

    it('should handle special characters in field names', () => {
      const params: FindParams = {
        sort: { 'field-name_with.special': 1 }
      };
      const result = queryFactory.createFindQuery(params);

      expect(result).toEqual([
        'FT.SEARCH',
        'indexName',
        '*',
        'SORTBY',
        'field-name_with.special',
        'ASC'
      ]);
    });

    it('should handle empty string values in aggregation', () => {
      const params: AggregationParams = {
        groupBy: ['']
      };
      const result = queryFactory.createAggregationQuery(params);

      expect(result).toEqual([
        'FT.AGGREGATE',
        'indexName',
        '*',
        'GROUPBY',
        '"1"',
        ''
      ]);
    });
  });
});
