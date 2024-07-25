import * as E from "fp-ts/lib/Either";
import { constTrue, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as redis from "redis";

export const setWithExpirationTask = (
  redisClient: redis.RedisClientType,
  key: string,
  value: string,
  expirationInSeconds: number,
  errorMsg?: string
): TE.TaskEither<Error, true> =>
  pipe(
    TE.tryCatch(
      () => redisClient.setEx(key, expirationInSeconds, value),
      () =>
        new Error(errorMsg ? errorMsg : "Error setting key value pair on redis")
    ),
    TE.map(_ => true)
  );

export const setTask = (
  redisClient: redis.RedisClientType,
  key: string,
  value: string,
  errorMsg?: string
): TE.TaskEither<Error, true> =>
  pipe(
    TE.tryCatch(
      () => redisClient.set(key, value),
      () =>
        new Error(errorMsg ? errorMsg : "Error setting key value pair on redis")
    ),
    TE.map(_ => true)
  );

export const deleteTask = (
  redisClient: redis.RedisClientType,
  key: string
): TE.TaskEither<Error, boolean> =>
  pipe(
    TE.tryCatch(
      () => redisClient.del(key),
      () => new Error("Error deleting key value pair on redis")
    ),
    TE.map(constTrue)
  );

export const getTask = (
  redisClient: redis.RedisClientType,
  key: string
): TE.TaskEither<Error, O.Option<string>> =>
  pipe(
    TE.tryCatch(
      () => redisClient.get(key),
      () => new Error("Error while retrieving value from redis")
    ),
    TE.map(O.fromNullable)
  );

export const pingTask = (
  redisClient: redis.RedisClientType
): TE.TaskEither<Error, true> =>
  pipe(
    TE.tryCatch(
      () => redisClient.ping("ping message"),
      () => new Error("Error while pinging redis")
    ),
    TE.map(_ => true)
  );
