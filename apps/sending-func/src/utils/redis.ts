/* eslint-disable no-invalid-this */
import * as O from "fp-ts/lib/Option";
import { identity, pipe } from "fp-ts/lib/function";
import * as redis from "redis";

import { IConfig } from "./config";

const DEFAULT_REDIS_PORT = "6379";

export type RedisClient = redis.RedisClientType | redis.RedisClusterType;

export class RedisClientFactory {
  protected readonly config: IConfig;
  protected readonly createClusterRedisClient = async (
    redisUrl: string,
    password?: string,
    port?: string,
  ): Promise<RedisClient> => {
    const redisPort: number = parseInt(port || DEFAULT_REDIS_PORT, 10);
    const redisClientConnection = redis.createCluster<
      redis.RedisDefaultModules,
      Record<string, never>,
      Record<string, never>
    >({
      defaults: {
        legacyMode: true,
        password,
      },
      rootNodes: [
        {
          url: `redis://${redisUrl}:${redisPort}`,
        },
      ],
      useReplicas: true,
    });
    await redisClientConnection.connect();
    return redisClientConnection;
  };

  protected readonly createSimpleRedisClient = async (
    redisUrl: string,
    password?: string,
    port?: string,
    useTls = true,
  ): Promise<RedisClient> => {
    const redisPort: number = parseInt(port || DEFAULT_REDIS_PORT, 10);
    const redisClientConnection = redis.createClient<
      redis.RedisDefaultModules,
      Record<string, never>,
      Record<string, never>
    >({
      password,
      socket: {
        port: redisPort,
        tls: useTls,
      },
      url: `redis://${redisUrl}`,
    });
    await redisClientConnection.connect();
    return redisClientConnection;
  };

  public readonly getInstance = async (): Promise<RedisClient> => {
    if (!this.redisClient) {
      this.redisClient = await pipe(
        this.config.isProduction,
        O.fromPredicate(identity),
        O.chainNullableK(() => this.config.REDIS_CLUSTER_ENABLED),
        O.chain(O.fromPredicate(identity)),
        O.map(() =>
          this.createClusterRedisClient(
            this.config.REDIS_URL,
            this.config.REDIS_PASSWORD,
            this.config.REDIS_PORT,
          ),
        ),
        O.getOrElse(() =>
          this.createSimpleRedisClient(
            this.config.REDIS_URL,
            this.config.REDIS_PASSWORD,
            this.config.REDIS_PORT,
            this.config.REDIS_TLS_ENABLED,
          ),
        ),
      );
    }
    return this.redisClient;
  };

  protected redisClient: RedisClient | undefined;

  constructor(config: IConfig) {
    this.config = config;
  }
}
