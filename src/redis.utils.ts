import { RedisConfig } from './redis.config';

export class RedisUtils {
  /**
   * Builds a Redis URL from a RedisConfig object.
   * @param {RedisConfig} config - The configuration object containing connection details.
   * @returns {string} The constructed Redis URL.
   */
  static buildRedisUrl(config: RedisConfig): string {
    const { user, password, iana, database } = config;
    let url = iana ? 'rediss://' : 'redis://';

    if (user && password) {
      url += `${user}:${password}@`;
    }

    const hosts = config.hosts.length ? config.hosts : ['localhost'];
    const ports = config.ports.length ? config.ports : ['6379'];
    const defaultPort = ports[0];

    let hostsPortsDiff = hosts.length - ports.length;
    while (hostsPortsDiff > 0) {
      ports.push(defaultPort);
      hostsPortsDiff = hosts.length - ports.length;
    }

    const hostsAndPorts = hosts.map((host, i) => {
      return `${host}:${ports[i]}`;
    });

    url += hostsAndPorts.join(',');

    if (database != null) {
      url += `/${database}`;
    }

    return url;
  };
}
