import { RedisConfig } from "./redis.config";

export class RedisUtils {
  /**
   * Builds a Redis URL from a RedisConfig object.
   * @param {RedisConfig} config - The configuration object containing connection details.
   * @returns {string} The constructed Redis URL.
   */
  static buildRedisUrl(config: RedisConfig): string {
    const { user, password, iana, database } = config;
    let url = iana ? "rediss://" : "redis://";

    if (password) {
      if (user) {
        url += `${user}:${password}@`;
      } else {
        // For Redis, when there's only password without user, we need to use a default user
        url += `default:${password}@`;
      }
    }

    const hosts = config.hosts.length ? config.hosts : ["localhost"];
    const ports = config.ports.length ? config.ports : ["6379"];
    const defaultPort = ports[0];

    let hostsPortsDiff = hosts.length - ports.length;
    while (hostsPortsDiff > 0) {
      ports.push(defaultPort);
      hostsPortsDiff = hosts.length - ports.length;
    }

    const hostsAndPorts = hosts.map((host, i) => {
      return `${host}:${ports[i]}`;
    });

    url += hostsAndPorts.join(",");

    // Note: Database selection is handled via SELECT command, not URL path
    // Redis client doesn't support database in URL path

    return url;
  }

  static convertStringToQueryArray(rawQuery: string) {
    const parts = rawQuery.match(/(?:[^\s"]+|"[^"]*")+/g);
    return parts ? parts.map((part) => part.replace(/"/g, "")) : [];
  }
}
