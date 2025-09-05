import {
  ReadWriteRepository,
  CollectionError,
  OperationStatus,
  RepositoryQuery,
  RemoveStats,
  UpdateStats,
  Result,
  FindParams,
  CountParams,
  RemoveParams,
  UpdateParams,
  AggregationParams,
  Mapper,
} from "@soapjs/soap";

import { RedisSource } from "./redis.source";
import { RedisRemoveQueryParams, RedisFindQueryParams } from "./redis.types";

/**
 * Represents a Redis set data source.
 * @class
 * @implements {Collection<T>}
 */
export class RedisSetCollection<T> extends ReadWriteRepository<T, T> {
  /**
   * Constructs a new RedisSetCollectionSource.
   * @constructor
   * @param {RedisSource} redisSource - The Redis data source.
   * @param {string} collectionName - The name of the collection.
   */
  constructor(
    protected redisSource: RedisSource,
    public readonly collectionName: string
  ) {
    super({} as any); // Placeholder context - Redis doesn't use standard context
  }

  private throwCollectionError(error: Error) {
    throw CollectionError.createError(error);
  }

  public async add(entities: T[]): Promise<Result<T[]>> {
    try {
      if (entities.length === 0) {
        return Result.withSuccess(entities);
      }

      const { collectionName } = this;
      const command = ["SADD", collectionName, ...entities.map(String)];

      await this.redisSource.client.sendCommand(command);
      return Result.withSuccess(entities);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  public async find(paramsOrQuery?: FindParams | RepositoryQuery): Promise<Result<T[]>> {
    try {
      const { collectionName } = this;
      const command = ["SMEMBERS", collectionName];
      
      const results: string[] = await this.redisSource.client.sendCommand(command);
      return Result.withSuccess(results as T[]);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  public async count(paramsOrQuery?: CountParams | RepositoryQuery): Promise<Result<number>> {
    try {
      const { collectionName } = this;
      const command = ["SCARD", collectionName];

      const count: number = await this.redisSource.client.sendCommand(command);
      return Result.withSuccess(count);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  public async remove(paramsOrQuery: RemoveParams | RepositoryQuery): Promise<Result<RemoveStats>> {
    try {
      const { collectionName, redisSource } = this;
      // For now, we'll clear the entire set
      // In a full implementation, you'd parse the RemoveParams or RepositoryQuery
      const command = ["DEL", collectionName];

      const deletedCount: number = await redisSource.client.sendCommand(
        command
      );

      const status =
        deletedCount > 0 ? OperationStatus.Success : OperationStatus.Failure;
      return Result.withSuccess({ status, deletedCount });
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  async aggregate<ResultType = T | T[], AggregationType = T>(
    paramsOrQuery: AggregationParams | RepositoryQuery,
    mapper?: Mapper<ResultType, AggregationType>
  ): Promise<Result<ResultType>> {
    // Redis doesn't have built-in aggregation, so we'll return empty result
    return Result.withSuccess([] as ResultType);
  }

  async update(paramsOrQuery: UpdateParams | RepositoryQuery): Promise<Result<UpdateStats>> {
    // Redis set updates would need to be implemented based on specific requirements
    return Result.withSuccess({ status: OperationStatus.Success, modifiedCount: 0 });
  }

  /**
   * Clears the Redis set collection.
   *
   * @async
   * @returns {Promise<Result<OperationStatus>>} A promise that resolves to a Result containing the operation status.
   */
  public async clear(): Promise<Result<OperationStatus>> {
    try {
      const { collectionName } = this;
      const command = ["DEL", collectionName];

      const isSuccess: number = await this.redisSource.client.sendCommand(
        command
      );

      const status =
        isSuccess > 0 ? OperationStatus.Success : OperationStatus.Failure;
      return Result.withSuccess(status);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }
}


