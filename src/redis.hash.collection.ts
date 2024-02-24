import {
  Collection,
  CollectionError,
  OperationStatus,
  Query,
  RemoveStats,
  UnknownObject,
  UpdateStats,
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
  implements Collection<T>
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
  public async find(query?: RedisFindQueryParams): Promise<T[]> {
    try {
      const documents: T[] = [];
      const { collectionName } = this;

      if (query) {
        for (const key of query) {
          const command = ["HGET", collectionName, key];
          const value: string = await this.redisSource.client.sendCommand(
            command
          );

          documents.push({
            [key]: value,
          } as T);
        }
      } else {
        const command = ["HGETALL", collectionName];
        const list: string[] = await this.redisSource.client.sendCommand(
          command
        );

        for (let i = 0; i < list.length; i += 2) {
          const key = list[i];
          const value = list[i + 1];

          documents.push({
            [key]: value,
          } as T);
        }
      }

      return documents;
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
      const command = ["HLEN", collectionName];

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
        args.push(item.key, toString(item.value));
      });

      const command = ["HMSET", collectionName, ...args];

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
      let deletedCount = 0;

      const command = ["HDEL", collectionName, ...params];

      const result: number = await redisSource.client.sendCommand(command);
      deletedCount += result;

      const status =
        deletedCount > 0 ? OperationStatus.Success : OperationStatus.Failure;

      return { status, deletedCount };
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  /**
   * Clears the Redis hash collection.
   *
   * @async
   * @returns {Promise<OperationStatus>} A promise that resolves to the operation status.
   * @throws {CollectionError} Throws CollectionError if an exception occurs during the clearing process.
   */
  public async clear(): Promise<OperationStatus> {
    try {
      const { collectionName } = this;
      const command = ["DEL", collectionName];

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
   * Aggregates data based on the provided query.
   *
   * @async
   * @template T - The type of data to be aggregated.
   * @param {Query} query - The query to be used for aggregation.
   * @returns {Promise<T[]>} A promise that resolves to the aggregated data.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  aggregate<T>(query: Query): Promise<T[]> {
    throw new Error("Method not implemented.");
  }

  /**
   * Updates data based on the provided query.
   *
   * @async
   * @param {Query} query - The query to be used for update.
   * @returns {Promise<UpdateStats>} A promise that resolves with the update stats.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  update(query: Query): Promise<UpdateStats> {
    throw new Error("Method not implemented.");
  }

  /**
   * Starts a transaction.
   *
   * @async
   * @param {UnknownObject} [options] - Transaction options.
   * @returns {Promise<void>} A promise that resolves when the transaction is started.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  startTransaction(options?: UnknownObject): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Commits the current transaction.
   *
   * @async
   * @returns {Promise<void>} A promise that resolves when the transaction is committed.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  commitTransaction(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Rolls back the current transaction.
   *
   * @async
   * @returns {Promise<void>} A promise that resolves when the transaction is rolled back.
   * @throws {Error} Throws an error indicating that the method is not implemented.
   */
  rollbackTransaction(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

const toString = (value: string | object | number | Buffer) =>
  value instanceof Buffer
    ? value.toString()
    : typeof value === "object"
    ? JSON.stringify(value)
    : String(value);
