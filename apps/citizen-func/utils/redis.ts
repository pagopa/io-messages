import { pipe } from "fp-ts/lib/function";
import * as redis from "redis";
import { getConfigOrThrow } from "./config";
const config = getConfigOrThrow();

const createSimpleRedisClient = (
  redisUrl: string,
  password?: string,
  port?: string,
  useTls: boolean = true
): redis.RedisClientType => {
  const DEFAULT_REDIS_PORT = "6379";

  const redisPort: number = parseInt(port || DEFAULT_REDIS_PORT, 10);
  return redis.createClient({
    password,
    url: `${redisUrl}:${redisPort}`,
    socket: {
      tls: useTls
    }
  });
};

export const REDIS_CLIENT = pipe(
  createSimpleRedisClient(
    config.REDIS_URL,
    config.REDIS_PASSWORD,
    config.REDIS_PORT,
    config.REDIS_TLS_ENABLED
  )
);
