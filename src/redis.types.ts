/**
 * Represents the Redis module.
 * @module Redis
 */

export * as Redis from "redis";

import { Order } from "@soapjs/soap";
import { Redis } from ".";

/**
 * Represents the Redis client type.
 * @typedef {import('redis').RedisClient} RedisClientType
 */
export type RedisClientType = ReturnType<typeof Redis.createClient>;

/**
 * Represents a Redis sorted set document.
 * @typedef {Object} RedisSortedDocument
 * @property {number} score - The score of the document.
 * @property {string} member - The member of the document.
 */
export type RedisSortedDocument = {
  score: number;
  member: string;
};

/**
 * Represents a Redis hash document.
 * @typedef {Object.<string, string|object|number|Buffer|boolean>} RedisHashDocument
 */
export type RedisHashDocument = {
  [key: string]: string | object | number | Buffer | boolean;
};

/**
 * Represents the query parameters for the Redis 'find' operation.
 * @typedef {string[]} RedisFindQueryParams
 */
export type RedisFindQueryParams = string[];

/**
 * Represents the query parameters for the Redis 'remove' operation.
 * @typedef {string[]} RedisRemoveQueryParams
 */
export type RedisRemoveQueryParams = string[];

/**
 * Represents the query parameters for the Redis 'list' operation.
 * @typedef {Object} RedisListQueryParams
 * @property {number} offset - The offset for pagination.
 * @property {number} limit - The limit for pagination.
 * @property {Order} order - The order of the results.
 */
export type RedisListQueryParams = {
  offset: number;
  limit: number;
  order: Order;
};
