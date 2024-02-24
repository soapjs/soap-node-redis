import {
  Collection,
  CollectionError,
  OperationStatus,
  Order,
  Query,
  RemoveStats,
  UnknownObject,
  UpdateStats,
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
  implements Collection<T>
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
  ) {}

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
   * @param {RedisFindQueryParams} [query] - The query parameters.
   * @returns {Promise<T[]>} - A promise that resolves to an array of found documents.
   */
  public async find(query: RedisFindQueryParams): Promise<T[]> {
    try {
      const documents: T[] = [];

      for (const member of query) {
        const score = await this.findOne(member);
        if (score != null) {
          documents.push((<RedisSortedDocument>{
            member,
            score,
          }) as T);
        }
      }

      return documents;
    } catch (error) {
      this.throwCollectionError(error);
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
   * @returns {Promise<number>} - A promise that resolves to the count of documents.
   */
  public async count(): Promise<number> {
    try {
      const { collectionName } = this;
      const command = ["ZCOUNT", collectionName, "-inf", "+inf"];

      const count: number = await this.redisSource.client.sendCommand(command);

      return count;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  /**
   * Inserts documents into the collection.
   * @param {records T[]} query - The documents to insert.
   * @returns {Promise<T[]>} - A promise that resolves to the inserted documents.
   */
  public async insert(records: T[]): Promise<T[]> {
    try {
      const { collectionName } = this;

      if (records.length === 0) {
        return;
      }

      const args = [];
      records.forEach((item) => {
        args.push(item.score.toString(), item.member);
      });

      const command = ["ZADD", collectionName, ...args];

      await this.redisSource.client.sendCommand(command);

      return records;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  /**
   * Removes documents from the collection based on the provided query parameters.
   * @param {RedisRemoveQueryParams} query - The query parameters.
   * @returns {Promise<RemoveStats>} - A promise that resolves to the remove statistics.
   */
  public async remove(params: RedisRemoveQueryParams): Promise<RemoveStats> {
    try {
      const { collectionName, redisSource } = this;

      const command = ["ZREM", collectionName, ...params];

      const deletedCount: number = await redisSource.client.sendCommand(
        command
      );

      const status =
        deletedCount > 0 ? OperationStatus.Success : OperationStatus.Failure;

      return { status, deletedCount };
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  /**
   * Clears the Redis sorted set collection.
   * @async
   * @returns {Promise} A promise that resolves to the operation status.
   * If the collection is cleared successfully, the promise resolves to OperationStatus.Success.
   * If an error occurs during the clearing process, the promise resolves to OperationStatus.Failure.
   * @throws {Error} Throws an error if an exception occurs during the clearing process.
   */
  public async clear(): Promise<OperationStatus> {
    try {
      const { collectionName } = this;

      const command = ["ZREMRANGEBYRANK", collectionName, "0", "-1"];

      const isSuccess: number = await this.redisSource.client.sendCommand(
        command
      );

      const status =
        isSuccess > 0 ? OperationStatus.Success : OperationStatus.Failure;
      return status;
    } catch (error) {
      this.throwCollectionError(error);
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
   * @template T - The type of the aggregated data.
   * @param {Query} query - The aggregation query.
   * @returns {Promise<T[]>} - A promise that resolves to the aggregated data.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  aggregate<T>(query: Query): Promise<T[]> {
    throw new Error("Method not implemented.");
  }

  /**
   * Updates documents in the collection based on the provided query.
   * @param {Query} query - The update query.
   * @returns {Promise<UpdateStats>} - A promise that resolves to the update statistics.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  update(query: Query): Promise<UpdateStats> {
    throw new Error("Method not implemented.");
  }

  /**
   * Starts a transaction on the Redis data source.
   * @param {UnknownObject} [options] - The transaction options.
   * @returns {Promise<void>} - A promise that resolves when the transaction is started.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  startTransaction(options?: UnknownObject): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Commits the active transaction on the Redis data source.
   * @returns {Promise<void>} - A promise that resolves when the transaction is committed.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  commitTransaction(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Rolls back the active transaction on the Redis data source.
   * @returns {Promise<void>} - A promise that resolves when the transaction is rolled back.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  rollbackTransaction(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
