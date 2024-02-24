import { Where } from "@soapjs/soap";

/**
 * Class for parsing Where clauses and converting them into Redis command parameters.
 */
export class RedisWhereParser {
  /**
   * Parses the Where clause and returns the Redis command parameters.
   * @param {Where} where - The Where clause to be parsed.
   * @returns {string[]} - An array of Redis command parameters.
   */
  public static parse(where: Where) {
    if (where instanceof Where && where.isRaw === false) {
      const {
        result: { ...chain },
      } = where;

      for (const chainKey in chain) {
        const key = chainKey;

        if (key == Where.KEYS) {
          if (chain[key].length && chain[key][0].value) {
            return chain[key][0].value as string[];
          }
        }
      }
    }
  }
}
