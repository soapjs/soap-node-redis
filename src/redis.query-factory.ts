import {
  AggregationParams,
  CountParams,
  FindParams,
  Mapper,
  RemoveParams,
  Where,
  RepositoryQuery,
} from "@soapjs/soap";
import { RedisWhereParser } from "./redis.where.parser";

/**
 * Represents a Redis query factory for constructing various types of queries .
 */
export class RedisQueryFactory {
  /**
   * Constructs a new instance of the RedisQueryFactory class.
   *
   * If a Mapper instance is provided, it can be used to convert entity keys
   * and values into a format suitable for Redis. This can be especially useful
   * in situations where the case of keys or format of values in the original entity
   * doesn't match Redis's requirements.
   *
   * @param {Mapper} [mapper] - An optional Mapper instance for entity key and value conversion.
   */
  constructor(private mapper?: Mapper) {}

  /**
   * Builds a find query for Redis using RediSearch.
   * @param {FindParams} params - The parameters for the find query.
   * @returns {string[]} The RediSearch find query.
   */
  public createFindQuery(params: FindParams): string[] {
    const { where, sort, limit, offset } = params;
    let query = [`FT.SEARCH`, `indexName`];

    if (where) {
      query.push(RedisWhereParser.parse(where));
    } else {
      query.push(`*`);
    }

    if (sort && typeof sort === "object") {
      for (const [field, order] of Object.entries(sort)) {
        query.push(`SORTBY`, field, order === -1 ? "DESC" : "ASC");
      }
    }

    if (limit !== undefined) {
      query.push(`LIMIT`, `${offset || 0}`, `${limit}`);
    }

    return query;
  }

  /**
   * Builds a count query for Redis using RediSearch.
   * @param {CountParams} params - The parameters for the count query.
   * @returns {string[]} The RediSearch count query.
   */
  public createCountQuery(params: CountParams): string[] {
    let query = [`FT.SEARCH`, `indexName`];

    if (params.where) {
      query.push(RedisWhereParser.parse(params.where), `LIMIT`, "0", "0");
    } else {
      query.push(`*`, `LIMIT`, `0`, `0`);
    }

    return query;
  }

  /**
   * Builds a remove query for Redis.
   * This would involve finding the keys based on the condition and then deleting them.
   * @param {string[]} keys
   * @returns {string[]} The Redis delete command.
   */
  public createRemoveQuery(keys: string[]): string[] {
    return ["DEL", ...keys];
  }

  /**
   * Builds an aggregation query for Redis using RediSearch.
   * @param {AggregationParams} params - The parameters for the aggregation query.
   * @returns {string[]} The RediSearch aggregation query.
   */
  public createAggregationQuery(params: AggregationParams): string[] {
    let query = [`FT.AGGREGATE`, `indexName`];

    if (params.where) {
      query.push(RedisWhereParser.parse(params.where));
    } else {
      query.push(`*`);
    }

    if (params.groupBy && params.groupBy.length > 0) {
      query.push(`GROUPBY`, `"${params.groupBy.length}"`, ...params.groupBy);
      if (params.sum) {
        query.push(`REDUCE`, `SUM`, `1`, params.sum, `AS`, `totalSum`);
      }
      if (params.count) {
        query.push(`REDUCE`, `COUNT`, `0`, `AS`, `count`);
      }
      if (params.average) {
        query.push(`REDUCE`, `AVG`, `1`, params.average, `AS`, `average`);
      }
      if (params.min) {
        query.push(`REDUCE`, `MIN`, `1`, params.min, `AS`, `min`);
      }
      if (params.max) {
        query.push(`REDUCE`, `MAX`, `1`, params.max, `AS`, `max`);
      }
    }

    if (params.sort) {
      for (const [field, order] of Object.entries(params.sort)) {
        query.push(`SORTBY`, `1`, field, order === -1 ? "DESC" : "ASC");
      }
    }

    return query;
  }
}
