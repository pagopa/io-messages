import { constTrue, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as redis from "redis";

export const setWithExpirationTask = (
  redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
  key: string,
  value: string,
  expirationInSeconds: number,
  errorMsg?: string
): TE.TaskEither<Error, boolean> =>
  pipe(
    redisClientTask,
    TE.chain(client =>
      TE.tryCatch(
        () => client.setEx(key, expirationInSeconds, value),
        () =>
          new Error(
            errorMsg ? errorMsg : "Error setting key value pair on redis"
          )
      )
    ),
    TE.map(constTrue)
  );

export const setTask = (
  redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
  key: string,
  value: string,
  errorMsg?: string
): TE.TaskEither<Error, boolean> =>
  pipe(
    redisClientTask,
    TE.chain(client =>
      TE.tryCatch(
        () => client.set(key, value),
        () =>
          new Error(
            errorMsg ? errorMsg : "Error setting key value pair on redis"
          )
      )
    ),
    TE.map(constTrue)
  );

export const deleteTask = (
  redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
  key: string
): TE.TaskEither<Error, boolean> =>
  pipe(
    redisClientTask,
    TE.chain(client =>
      TE.tryCatch(
        () => client.del(key),
        () => new Error("Error deleting key value pair on redis")
      )
    ),
    TE.map(constTrue)
  );

export const getTask = (
  redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
  key: string
): TE.TaskEither<Error, O.Option<string>> =>
  pipe(
    redisClientTask,
    TE.chain(client =>
      TE.tryCatch(
        () => client.get(key),
        () => new Error("Error while retrieving value from redis")
      )
    ),
    TE.map(O.fromNullable)
  );

export const pingTask = (
  redisClientTask: TE.TaskEither<Error, redis.RedisClientType>
): TE.TaskEither<Error, boolean> =>
  pipe(
    redisClientTask,
    TE.chain(client =>
      TE.tryCatch(
        () => client.ping("ping message"),
        () => new Error("Error while pinging redis")
      )
    ),
    TE.map(constTrue)
  );
