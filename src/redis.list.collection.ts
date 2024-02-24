import {
  Collection,
  CollectionError,
  OperationStatus,
  Query,
  RemoveStats,
  UnknownObject,
  UpdateStats,
} from "@soapjs/soap";

import { RedisSource } from "./redis.source";
import { RedisFindQueryParams, RedisRemoveQueryParams } from "./redis.types";

/**
 * Represents a Redis list data source.
 * @class
 * @implements {Collection<T>}
 */
export class RedisListCollection<T> implements Collection<T> {
  /**
   * Constructs a new RedisListCollectionSource.
   * @constructor
   * @param {RedisSource} redisSource - The Redis data source.
   * @param {string} collectionName - The name of the collection.
   */
  constructor(
    protected redisSource: RedisSource,
    public readonly collectionName: string
  ) {}

  private throwCollectionError(error: Error) {
    throw CollectionError.createError(error);
  }

  public async insert(records: T[]): Promise<T[]> {
    try {
      const { collectionName } = this;
      const command = ["RPUSH", collectionName, ...records.map(String)];

      await this.redisSource.client.sendCommand(command);
      return records;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  public async find(query: RedisFindQueryParams): Promise<T[]> {
    try {
      const results: string[] = [];
      for (const member of query) {
        const found = await this.findOne(member);
        if (found) results.push(member);
      }
      return results as T[];
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  public async findOne(member: string): Promise<boolean> {
    try {
      const command = ["LPOP", this.collectionName, member];
      const result: number = await this.redisSource.client.sendCommand(command);
      return result === 1;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  public async count(): Promise<number> {
    try {
      const { collectionName } = this;
      const command = ["LLEN", collectionName];

      const count: number = await this.redisSource.client.sendCommand(command);
      return count;
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  public async remove(params: RedisRemoveQueryParams): Promise<RemoveStats> {
    try {
      const { collectionName, redisSource } = this;
      let deletedCount = 0;

      for (const value of params) {
        const command = ["LREM", collectionName, "0", value];
        const result: number = await redisSource.client.sendCommand(command);
        deletedCount += result;
      }

      const status =
        deletedCount > 0 ? OperationStatus.Success : OperationStatus.Failure;
      return { status, deletedCount };
    } catch (error) {
      this.throwCollectionError(error);
    }
  }

  aggregate<T>(query: Query): Promise<T[]> {
    throw new Error("Method not implemented.");
  }
  update(query: Query): Promise<UpdateStats> {
    throw new Error("Method not implemented.");
  }
  startTransaction(options?: UnknownObject): Promise<void> {
    throw new Error("Method not implemented.");
  }
  commitTransaction(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  rollbackTransaction(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
