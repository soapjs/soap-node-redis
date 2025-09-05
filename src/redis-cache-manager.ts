import { CacheManager, CacheOptions } from "@soapjs/soap";
import { RedisClientType } from "./redis.types";

/**
 * Redis cache manager implementation
 */
export class RedisCacheManager implements CacheManager {
  private client: RedisClientType;
  private enabled: boolean;
  private defaultTtl: number;
  private prefix: string;
  public readonly options: CacheOptions;

  constructor(client: RedisClientType, options: CacheOptions) {
    this.client = client;
    this.enabled = options.enabled ?? true;
    this.defaultTtl = options.ttl;
    this.prefix = options.prefix ?? '';
    this.options = options;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key);
      const value = await this.client.get(fullKey);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const fullKey = this.buildKey(key);
      let serializedValue: string;
      
      try {
        serializedValue = JSON.stringify(value);
      } catch (jsonError) {
        console.error('Redis cache serialization error:', jsonError);
        return; // Don't store values that can't be serialized
      }
      
      const ttlSeconds = ttl ?? this.defaultTtl;
      
      if (ttlSeconds === 0) {
        // For zero TTL, use SET without expiration
        await this.client.set(fullKey, serializedValue);
      } else {
        await this.client.setEx(fullKey, ttlSeconds, serializedValue);
      }
    } catch (error) {
      console.error('Redis cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const fullKey = this.buildKey(key);
      await this.client.del(fullKey);
    } catch (error) {
      console.error('Redis cache delete error:', error);
    }
  }

  async clear(prefix?: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const clearPrefix = prefix || this.prefix;
      const pattern = clearPrefix ? `${clearPrefix}:*` : '*';
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Redis cache clear error:', error);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  generateKey(operation: string, query: any): string {
    const queryString = JSON.stringify(query || {});
    const encodedQuery = Buffer.from(queryString).toString('base64');
    return `${operation}:${encodedQuery}`;
  }

  private buildKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }
}
