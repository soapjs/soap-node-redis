import { RedisConfig } from "./redis.config";
import { Redis, RedisClientType } from "./redis.types";
import { RedisUtils } from "./redis.utils";

/**
 * Represents a Redis data source.
 */
export class RedisSource {
  /**
   * Creates a new RedisSource instance and establishes a connection to the Redis server.
   * @param {RedisConfig} config - The configuration object for the Redis connection.
   * @returns {Promise<RedisSource>} A promise that resolves to a new RedisSource instance.
   */
  public static async create(config: RedisConfig): Promise<RedisSource> {
    const url = RedisUtils.buildRedisUrl(config);
    const client = Redis.createClient({ url });

    client.on("error", (error) => console.log(`[Redis] Error: ${error}`));
    await client.connect();

    // Select database if specified
    if (config.database != null) {
      await client.select(Number(config.database));
    }

    return new RedisSource(client);
  }

  /**
   * Creates a new RedisSource instance.
   * @param {RedisClientType} client - The Redis client instance.
   */
  private constructor(public readonly client: RedisClientType) {}
}
