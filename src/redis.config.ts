import { ConfigVars } from "@soapjs/soap";

/**
 * Represents the Redis configuration.
 * @property {string[]} hosts - The Redis server hosts.
 * @property {string[]} ports - The Redis server ports.
 * @property {boolean} [iana] - Whether to use the IANA protocol.
 * @property {string} [user] - The Redis username.
 * @property {string} [password] - The Redis password.
 * @property {string|number} [database] - The Redis database name or number.
 */
export class RedisConfig {
  /**
   * Builds a Redis configuration object based on the provided configuration variables.
   *
   * @param {ConfigVars} configVars - The configuration variables object.
   * @param {string} [prefix=''] - The prefix to prepend to the configuration variable names.
   * @returns {RedisConfig} The Redis configuration object.
   */
  static create(configVars: ConfigVars, prefix = ""): RedisConfig {
    const p = prefix
      ? prefix.endsWith("_")
        ? prefix.toUpperCase()
        : prefix.toUpperCase() + "_"
      : "";

    return new RedisConfig(
      configVars.getArrayEnv(`${p}REDIS_HOSTS`),
      configVars.getArrayEnv(`${p}REDIS_PORTS`),
      configVars.getBooleanEnv(`${p}REDIS_IANA`),
      configVars.getStringEnv(`${p}REDIS_USER`),
      configVars.getStringEnv(`${p}REDIS_PASSWORD`),
      configVars.getStringEnv(`${p}REDIS_DB_NAME`)
    );
  }

  constructor(
    public readonly hosts: string[],
    public readonly ports: string[],
    public readonly iana?: boolean,
    public readonly user?: string,
    public readonly password?: string,
    public readonly database?: string | number
  ) {}
}
