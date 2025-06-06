import * as TE from "fp-ts/TaskEither";
import { constVoid, pipe } from "fp-ts/lib/function";
import * as redis from "redis";

import { RedisParams } from "./config";
import { IConfig } from "./config";

export const createSimpleRedisClient = async (
  redisUrl: string,
  password?: string,
  port?: string,
  enableTls = true,
): Promise<redis.RedisClientType> => {
  const REDIS_PORT = enableTls ? "6380" : "6379";
  const prefixUrl = enableTls ? "rediss://" : "redis://";
  const completeRedisUrl = `${prefixUrl}${redisUrl}`;

  const redisPort: number = parseInt(port || REDIS_PORT, 10);

  const redisClient = redis.createClient<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>
  >({
    legacyMode: false,
    password,
    // 9 minutes PING interval. this solves the `socket closed unexpectedly` event for Azure Cache for Redis
    // (https://github.com/redis/node-redis/issues/1598)
    pingInterval: 1000 * 60 * 9,
    socket: {
      checkServerIdentity: () => undefined,
      keepAlive: 2000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      tls: enableTls,
    },
    url: `${completeRedisUrl}:${redisPort}`,
  });
  await redisClient.connect();
  return redisClient;
};

export const CreateRedisClientTask: (
  config: RedisParams,
) => TE.TaskEither<Error, redis.RedisClientType> = (config) =>
  pipe(
    TE.tryCatch(
      () =>
        createSimpleRedisClient(
          config.REDIS_URL,
          config.REDIS_PASSWORD,
          config.REDIS_PORT,
          config.REDIS_TLS_ENABLED,
        ),
      () => new Error("Error Connecting redis cluster"),
    ),
    TE.chain((redisClient) => {
      redisClient.on("connect", () => {
        // eslint-disable-next-line no-console
        console.info("Client connected to redis...");
      });

      redisClient.on("ready", () => {
        // eslint-disable-next-line no-console
        console.info("Client connected to redis and ready to use...");
      });

      redisClient.on("reconnecting", () => {
        // eslint-disable-next-line no-console
        console.info("Client reconnecting...");
      });

      redisClient.on("error", (err) => {
        // eslint-disable-next-line no-console
        console.info(`Redis error: ${err}`);
      });

      redisClient.on("end", () => {
        // eslint-disable-next-line no-console
        console.info("Client disconnected from redis");
      });
      return TE.right(redisClient);
    }),
  );

let REDIS_CLIENT: redis.RedisClientType;

/**
 * Create a TaskEither that evaluate REDIS_CLIENT at runtime.
 * When REDIS_CLIENT is defined it's returned as result, otherwhise
 * a new Redis Client will be created and REDIS_CLIENT defined
 * for the future requests.
 *
 * @param config
 * @returns
 */
export const CreateRedisClientSingleton = (
  config: RedisParams,
): TE.TaskEither<Error, redis.RedisClientType> =>
  pipe(
    REDIS_CLIENT,
    TE.fromPredicate(
      (maybeRedisClient): maybeRedisClient is redis.RedisClientType =>
        maybeRedisClient !== undefined,
      constVoid,
    ),
    TE.orElseW(() => CreateRedisClientTask(config)),
    TE.map((newRedisClient) => (REDIS_CLIENT = newRedisClient)),
  );

export const singleStringReply = (
  command: TE.TaskEither<Error, null | string>,
): TE.TaskEither<Error, boolean> =>
  pipe(
    command,
    TE.map((reply) => reply === "OK"),
  );

export const falsyResponseToErrorAsync =
  (error: Error) =>
  (response: TE.TaskEither<Error, boolean>): TE.TaskEither<Error, true> =>
    pipe(
      response,
      TE.chain((value) => (value ? TE.right(value) : TE.left(error))),
    );

type RedisClient = redis.RedisClientType;

const DEFAULT_REDIS_PORT = "6379";

export class RedisClientFactory {
  protected readonly config: IConfig;
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
      pingInterval: 1000 * 60 * 9,
      socket: {
        port: redisPort,
        tls: useTls,
      },
      url: useTls ? `rediss://${redisUrl}` : `redis://${redisUrl}`,
    });
    await redisClientConnection.connect();
    return redisClientConnection;
  };

  public readonly getInstance = async (): Promise<RedisClient> => {
    if (!this.redisClient) {
      this.redisClient = await this.createSimpleRedisClient(
        this.config.REDIS_URL,
        this.config.REDIS_PASSWORD,
        this.config.REDIS_PORT,
        this.config.REDIS_TLS_ENABLED,
      );
    }
    return this.redisClient;
  };

  protected redisClient: RedisClient | undefined;

  constructor(config: IConfig) {
    this.config = config;
  }
}
