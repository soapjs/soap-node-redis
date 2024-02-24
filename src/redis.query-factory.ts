import {
  AggregationParams,
  FindParams,
  Query,
  QueryFactory,
  RemoveParams,
  UnknownObject,
  UpdateMethod,
  Where,
} from "@soapjs/soap";
import { RedisFindQueryParams, RedisRemoveQueryParams } from "./redis.types";

import { RedisWhereParser } from "./redis.where.parser";

/**
 * Represents a Redis query builder for constructing various types of queries.
 * @template DocumentType - The type of the Redis document.
 */
export class RedisQueryFactory implements QueryFactory {
  /**
   * Builds a find query for Redis.
   * @param {FindParams} params - The parameters for the find query.
   * @returns {RedisFindQueryParams} The find query parameters.
   */
  createFindQuery(params: FindParams): RedisFindQueryParams {
    const { where } = params;

    return RedisWhereParser.parse(where) ?? [];
  }

  /**
   * Builds a remove query for Redis.
   *
   * @param {RemoveParams} params - The parameters for the remove query.
   * @returns {RedisRemoveQueryParams} The remove query parameters.
   */
  createRemoveQuery(params: RemoveParams): RedisRemoveQueryParams {
    const { where } = params;

    return RedisWhereParser.parse(where) ?? [];
  }

  /**
   * Builds a count query for Redis.
   *
   * @returns {Query} The count query.
   */
  createCountQuery(): Query {
    return "";
  }

  /**
   * Builds an update query for Redis.
   *
   * @template UpdateType - The type of the update.
   * @param {UpdateType[]} updates - The updates to be applied.
   * @param {Where<UnknownObject>[]} where - The conditions for the update.
   * @param {UpdateMethod[]} methods - The update methods to be used.
   * @returns {Query} The update query.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  createUpdateQuery<UpdateType = unknown>(
    updates: UpdateType[],
    where: Where<UnknownObject>[],
    methods: UpdateMethod[]
  ): Query {
    throw new Error("Method not implemented.");
  }

  /**
   * Builds an aggregation query for Redis.
   *
   * @param {AggregationParams} params - The parameters for the aggregation query.
   * @returns {Query} The aggregation query.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  createAggregationQuery(params: AggregationParams): Query {
    throw new Error("Method not implemented.");
  }
}
