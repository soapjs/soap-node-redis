import {
  ReadWriteRepository,
  CollectionError,
  OperationStatus,
  Order,
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
import {
  RedisFindQueryParams,
  RedisListQueryParams,
  RedisRemoveQueryParams,
  RedisSortedDocument,
} from "./redis.types";

/**
 * Represents Redis data source.
 * @class
 * @implements {Collection<T>}
 */
export class RedisSortedSetCollection<T extends RedisSortedDocument>
  extends ReadWriteRepository<T, T>
{
  /**
   * Constructs a new RedisSortedSetCollection.
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
      const command = ["ZRANGE", collectionName, "0", "-1", "WITHSCORES"];
      
      const list: string[] = await this.redisSource.client.sendCommand(command);
      const documents: T[] = [];

      for (let i = 0; i < list.length; i += 2) {
        const member = list[i];
        const score = Number(list[i + 1]);

        documents.push((<RedisSortedDocument>{
          member,
          score,
        }) as T);
      }

      return Result.withSuccess(documents);
    } catch (error) {
      return Result.withFailure(CollectionError.createError(error));
    }
  }

  /**
   * Finds a document in the collection based on the provided key.
   * @param {string} [member] - The query parameters.
   * @returns {Promise<number>} - A promise that resolves to an array of found documents.
   */
  public async findOne(member: string): Promise<number | null> {
    try {
      const { collectionName } = this;

      const command = ["ZSCORE", collectionName, member];

      const score = await this.redisSource.client.sendCommand(command);

      if (score != null) {
        return Number(score);
      }
      return null;
    } catch (error) {
      this.throwCollectionError(error);
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
      const command = ["ZCOUNT", collectionName, "-inf", "+inf"];

      const count: number = await this.redisSource.client.sendCommand(command);

      return Result.withSuccess(count);
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
      const { collectionName } = this;

      if (entities.length === 0) {
        return Result.withSuccess([]);
      }

      const args = [];
      entities.forEach((item) => {
        args.push(item.score.toString(), item.member);
      });

      const command = ["ZADD", collectionName, ...args];

      await this.redisSource.client.sendCommand(command);

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

      // For now, we'll clear the entire sorted set
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

  /**
   * Clears the Redis sorted set collection.
   * @async
   * @returns {Promise<Result<OperationStatus>>} A promise that resolves to a Result containing the operation status.
   */
  public async clear(): Promise<Result<OperationStatus>> {
    try {
      const { collectionName } = this;

      const command = ["ZREMRANGEBYRANK", collectionName, "0", "-1"];

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

  /**
   * Lists documents from the collection based on the provided query parameters.
   * @param {RedisListQueryParams} params - The query parameters.
   * @returns {Promise<T[]>} - A promise that resolves to the list of documents.
   */
  public async list(params: RedisListQueryParams): Promise<T[]> {
    try {
      const documents: T[] = [];
      const { collectionName } = this;
      const { offset, limit, order } = params;

      const command = [
        order === Order.ASC ? "ZRANGE" : "ZREVRANGE",
        collectionName,
        String(offset),
        String(Number(offset) + (Number(limit) - 1)),
        "WITHSCORES",
      ];

      const list: string[] = await this.redisSource.client.sendCommand(command);

      for (let i = 0; i < list.length; i += 2) {
        const member = list[i];
        const score = Number(list[i + 1]);

        documents.push((<RedisSortedDocument>{
          member,
          score,
        }) as T);
      }

      return documents;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  /**
   * Gets the rank of a member in the sorted set collection.
   * @param {string} member - The member to get the rank of.
   * @param {Order} order - The order used for ranking (ASC or DESC).
   * @returns {Promise<number>} - A promise that resolves to the rank of the member.
   */
  public async getRank(member: string, order: Order): Promise<number> {
    try {
      const { collectionName } = this;

      const command = [
        order === Order.ASC ? "ZRANK" : "ZREVRANK",
        collectionName,
        member,
      ];

      const rank: number = await this.redisSource.client.sendCommand(command);

      return rank;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  /**
   * Checks if the collection exists in the Redis source.
   * @returns {Promise<boolean>} - A promise that resolves to true if the collection exists, otherwise false.
   */
  public async collectionExists(): Promise<boolean> {
    try {
      const { collectionName } = this;

      const result = await this.redisSource.client.EXISTS(collectionName);

      return result > 0;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  /**
   * Deletes the collection from the Redis source.
   * @async
   * @returns {Promise<OperationStatus>} - A promise that resolves to the operation status.
   * If the collection is deleted successfully, the promise resolves to OperationStatus.Success.
   * If an error occurs during the deletion process, the promise resolves to OperationStatus.Failure.
   * @throws {CollectionError} - The CollectionError with the appropriate error type.
   */
  public async deleteCollection(): Promise<OperationStatus> {
    try {
      const { collectionName } = this;

      const status = await this.redisSource.client.DEL(collectionName);

      return status > 0 ? OperationStatus.Success : OperationStatus.Failure;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  /**
   * Aggregates data from the collection based on the provided query.
   * @template ResultType - The type of the aggregated data.
   * @param {AggregationParams | RepositoryQuery} paramsOrQuery - The aggregation parameters.
   * @param {Mapper<ResultType, any>} [mapper] - Optional mapper for result transformation.
   * @returns {Promise<Result<ResultType>>} - A promise that resolves to a Result containing the aggregated data.
   */
  async aggregate<ResultType = T | T[], AggregationType = T>(
    paramsOrQuery: AggregationParams | RepositoryQuery,
    mapper?: Mapper<ResultType, AggregationType>
  ): Promise<Result<ResultType>> {
    // Redis doesn't have built-in aggregation, so we'll return empty result
    return Result.withSuccess([] as ResultType);
  }

  /**
   * Updates documents in the collection based on the provided query.
   * @param {UpdateParams | RepositoryQuery} paramsOrQuery - The update parameters.
   * @returns {Promise<Result<UpdateStats>>} - A promise that resolves to a Result containing the update statistics.
   */
  async update(paramsOrQuery: UpdateParams | RepositoryQuery): Promise<Result<UpdateStats>> {
    // Redis sorted set updates would need to be implemented based on specific requirements
    return Result.withSuccess({ status: OperationStatus.Success, modifiedCount: 0 });
  }
}
