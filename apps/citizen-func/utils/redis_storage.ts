import { constTrue, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as redis from "redis";

const isSetResponseOk = (response: string): boolean => response === "OK";
const isDelResponseOk = (response: number): boolean => response >= 0;

const falsyResponseToErrorAsync = (error: Error) => (
  response: TE.TaskEither<Error, boolean>
): TE.TaskEither<Error, true> =>
  pipe(
    response,
    TE.chain(value => (value ? TE.right(value) : TE.left(error)))
  );

export const setWithExpirationTask = (
  redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
  key: string,
  value: string,
  expirationInSeconds: number,
  errorMsg: string = "Error setting key value pair on redis"
): TE.TaskEither<Error, boolean> =>
  pipe(
    redisClientTask,
    TE.chain(client =>
      TE.tryCatch(
        () => client.setEx(key, expirationInSeconds, value),
        () => new Error(errorMsg)
      )
    ),
    TE.map(isSetResponseOk),
    falsyResponseToErrorAsync(new Error(errorMsg))
  );

export const setTask = (
  redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
  key: string,
  value: string,
  errorMsg: string = "Error setting key value pair on redis"
): TE.TaskEither<Error, boolean> =>
  pipe(
    redisClientTask,
    TE.chain(client =>
      TE.tryCatch(
        () => client.set(key, value),
        () => new Error(errorMsg)
      )
    ),
    TE.map(isSetResponseOk),
    falsyResponseToErrorAsync(new Error(errorMsg))
  );

export const deleteTask = (
  redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
  key: string,
  errorMsg: string = "Error deleting key value pair on redis"
): TE.TaskEither<Error, boolean> =>
  pipe(
    redisClientTask,
    TE.chain(client =>
      TE.tryCatch(
        () => client.del(key),
        () => new Error(errorMsg)
      )
    ),
    TE.map(isDelResponseOk),
    falsyResponseToErrorAsync(new Error(errorMsg))
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
