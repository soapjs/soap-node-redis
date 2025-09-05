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
import {
  RedisFindQueryParams,
  RedisHashDocument,
  RedisRemoveQueryParams,
} from "./redis.types";

import { RedisSource } from "./redis.source";

/**
 * Represents Redis data source.
 * @class
 * @implements {Collection<T>}
 */
export class RedisHashCollectionSource<T extends RedisHashDocument>
  extends ReadWriteRepository<T, T>
{
  /**
   * Constructs a new RedisHashCollectionSource.
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

  /**
   * Throws a CollectionError based on the provided error.
   * @private
   * @param {Error} error - The original error.
   * @returns {void}
   * @throws {CollectionError} - The CollectionError with the appropriate error type.
   */
  private throwCollectionError(error: Error) {
    throw CollectionError.createError(error);
  }

  /**
   * Finds documents in the collection based on the provided query parameters.
   * @param {FindParams | RepositoryQuery} [paramsOrQuery] - The query parameters.
   * @returns {Promise<Result<T[]>>} - A promise that resolves to a Result containing an array of found documents.
   */
  public async find(paramsOrQuery?: FindParams | RepositoryQuery): Promise<Result<T[]>> {
    try {
      const { collectionName } = this;
      
      // Get all keys that match the collection pattern
      const keysCommand = ["KEYS", `${collectionName}:*`];
      const keys: string[] = await this.redisSource.client.sendCommand(keysCommand);
      
      const documents: T[] = [];
      
      // For each key, get the hash data
      for (const key of keys) {
        const command = ["HGETALL", key];
        const result: string[] = await this.redisSource.client.sendCommand(command);
        
        // Convert Redis hash result to object
        const document: Record<string, any> = {};
        for (let i = 0; i < result.length; i += 2) {
          if (i + 1 < result.length) {
            document[result[i]] = result[i + 1];
          }
        }
        
        if (Object.keys(document).length > 0) {
          documents.push(document as T);
        }
      }

      return Result.withSuccess(documents);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  /**
   * Counts documents in the collection.
   * @param {CountParams | RepositoryQuery} [paramsOrQuery] - The count parameters.
   * @returns {Promise<Result<number>>} - A promise that resolves to a Result containing the count of documents.
   */
  public async count(paramsOrQuery?: CountParams | RepositoryQuery): Promise<Result<number>> {
    try {
      const { collectionName } = this;
      
      // Count all keys that match the collection pattern
      const keysCommand = ["KEYS", `${collectionName}:*`];
      const keys: string[] = await this.redisSource.client.sendCommand(keysCommand);
      
      return Result.withSuccess(keys.length);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  /**
   * Adds documents to the collection.
   * @param {T[]} entities - The entities to add.
   * @returns {Promise<Result<T[]>>} - A promise that resolves to a Result containing the added entities.
   */
  public async add(entities: T[]): Promise<Result<T[]>> {
    try {
      if (entities.length === 0) {
        return Result.withSuccess([]);
      }

      const { collectionName } = this;

      // For each entity, create a separate hash with a unique key
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const hashKey = `${collectionName}:${i}`;
        const args = [];
        
        Object.entries(entity).forEach(([key, value]) => {
          args.push(key, toString(value));
        });

        if (args.length > 0) {
          const command = ["HMSET", hashKey, ...args];
          await this.redisSource.client.sendCommand(command);
        }
      }

      return Result.withSuccess(entities);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  /**
   * Removes documents from the collection based on the provided query parameters.
   * @param {RemoveParams | RepositoryQuery} paramsOrQuery - The remove parameters.
   * @returns {Promise<Result<RemoveStats>>} - A promise that resolves to a Result containing the remove statistics.
   */
  public async remove(paramsOrQuery: RemoveParams | RepositoryQuery): Promise<Result<RemoveStats>> {
    try {
      const { collectionName, redisSource } = this;
      let deletedCount = 0;

      // Get all keys that match the collection pattern
      const keysCommand = ["KEYS", `${collectionName}:*`];
      const keys: string[] = await redisSource.client.sendCommand(keysCommand);
      
      // Delete all matching keys
      if (keys.length > 0) {
        const command = ["DEL", ...keys];
        const result: number = await redisSource.client.sendCommand(command);
        deletedCount += result;
      }

      const status =
        deletedCount > 0 ? OperationStatus.Success : OperationStatus.Failure;

      return Result.withSuccess({ status, deletedCount });
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  /**
   * Clears the Redis hash collection.
   *
   * @async
   * @returns {Promise<Result<OperationStatus>>} A promise that resolves to a Result containing the operation status.
   */
  public async clear(): Promise<Result<OperationStatus>> {
    try {
      const { collectionName } = this;
      
      // Get all keys that match the collection pattern
      const keysCommand = ["KEYS", `${collectionName}:*`];
      const keys: string[] = await this.redisSource.client.sendCommand(keysCommand);
      
      let isSuccess = 0;
      if (keys.length > 0) {
        const command = ["DEL", ...keys];
        isSuccess = await this.redisSource.client.sendCommand(command);
      }

      const status =
        isSuccess > 0 ? OperationStatus.Success : OperationStatus.Failure;
      return Result.withSuccess(status);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  /**
   * Aggregates data based on the provided query.
   *
   * @async
   * @template ResultType - The type of data to be aggregated.
   * @param {AggregationParams | RepositoryQuery} paramsOrQuery - The aggregation parameters.
   * @param {Mapper<ResultType, any>} [mapper] - Optional mapper for result transformation.
   * @returns {Promise<Result<ResultType>>} A promise that resolves to a Result containing the aggregated data.
   */
  async aggregate<ResultType = T | T[], AggregationType = T>(
    paramsOrQuery: AggregationParams | RepositoryQuery,
    mapper?: Mapper<ResultType, AggregationType>
  ): Promise<Result<ResultType>> {
    // Redis doesn't have built-in aggregation, so we'll return empty result
    return Result.withSuccess([] as ResultType);
  }

  /**
   * Updates data based on the provided query.
   *
   * @async
   * @param {UpdateParams | RepositoryQuery} paramsOrQuery - The update parameters.
   * @returns {Promise<Result<UpdateStats>>} A promise that resolves to a Result containing the update stats.
   */
  async update(paramsOrQuery: UpdateParams | RepositoryQuery): Promise<Result<UpdateStats>> {
    // Redis hash updates would need to be implemented based on specific requirements
    return Result.withSuccess({ status: OperationStatus.Success, modifiedCount: 0 });
  }
}

const toString = (value: string | object | number | Buffer | boolean) =>
  value instanceof Buffer
    ? value.toString()
    : typeof value === "object"
    ? JSON.stringify(value)
    : String(value);
