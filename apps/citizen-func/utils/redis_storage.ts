import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as redis from "redis";
import { RedisClientFactory, singleStringReply } from "./redis";

export const setWithExpirationTask = (
  redisClientFactory: RedisClientFactory,
  key: string,
  value: string,
  expirationInSeconds: number,
  errorMsg: string = "Error setting key value pair on redis"
): TE.TaskEither<Error, boolean> =>
  pipe(
    TE.tryCatch(() => redisClientFactory.getInstance(), E.toError),
    TE.chain(client =>
      TE.tryCatch(
        () => client.setEx(key, expirationInSeconds, value),
        () => new Error(errorMsg)
      )
    ),
    singleStringReply,
    falsyResponseToErrorAsync(new Error(errorMsg))
  );

export const setTask = (
  redisClientFactory: RedisClientFactory,
  key: string,
  value: string,
  errorMsg: string = "Error setting key value pair on redis"
): TE.TaskEither<Error, boolean> =>
  pipe(
    TE.tryCatch(() => redisClientFactory.getInstance(), E.toError),
    TE.chain(client =>
      TE.tryCatch(
        () => client.set(key, value),
        () => new Error(errorMsg)
      )
    ),
    singleStringReply,
    falsyResponseToErrorAsync(new Error(errorMsg))
  );

// TODO: remove this implementation if we do not need the singletone approach
// export const setWithExpirationTask = (
//   redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
//   key: string,
//   value: string,
//   expirationInSeconds: number,
//   errorMsg: string = "Error setting key value pair on redis"
// ): TE.TaskEither<Error, boolean> =>
//   pipe(
//     redisClientFactory,
//     TE.chain(client =>
//       TE.tryCatch(
//         () => client.setEx(key, expirationInSeconds, value),
//         () => new Error(errorMsg)
//       )
//     ),
//     singleStringReply,
//     falsyResponseToErrorAsync(new Error(errorMsg))
//   );

// TODO: remove this implementation if we do not need the singletone approach
// export const setTask = (
//   redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
//   key: string,
//   value: string,
//   errorMsg: string = "Error setting key value pair on redis"
// ): TE.TaskEither<Error, boolean> =>
//   pipe(
//     redisClientTask,
//     TE.chain(client =>
//       TE.tryCatch(
//         () => client.set(key, value),
//         () => new Error(errorMsg)
//       )
//     ),
//     singleStringReply,
//     falsyResponseToErrorAsync(new Error(errorMsg))
//   );

// TODO: remove this implementation if we do not need the singletone approach
// export const getTask = (
//   redisClientTask: TE.TaskEither<Error, redis.RedisClientType>,
//   key: string
// ): TE.TaskEither<Error, O.Option<string>> =>
//   pipe(
//     redisClientTask,
//     TE.chain(client =>
//       TE.tryCatch(
//         () => client.get(key),
//         () => new Error("Error while retrieving value from redis")
//       )
//     ),
//     TE.map(O.fromNullable)
//   );

/**
 * Parse a Redis single string reply.
 *
 * @see https://redis.io/topics/protocol#simple-string-reply.
 */
export const singleStringReplyAsync = (
  command: TE.TaskEither<Error, string | null>
): TE.TaskEither<Error, boolean> =>
  pipe(
    command,
    TE.map(reply => reply === "OK")
  );

/**
 * Parse a Redis single string reply.
 *
 * @see https://redis.io/topics/protocol#simple-string-reply.
 */
export const singleValueReplyAsync = (
  command: TE.TaskEither<Error, string | null>
): TE.TaskEither<Error, O.Option<string>> =>
  pipe(command, TE.map(O.fromNullable));

/**
 * Parse a Redis integer reply.
 *
 * @see https://redis.io/topics/protocol#integer-reply
 */
export const integerReplAsync = (expectedReply?: number) => (
  command: TE.TaskEither<Error, unknown>
): TE.TaskEither<Error, boolean> =>
  pipe(
    command,
    TE.map(reply => {
      if (expectedReply !== undefined && expectedReply !== reply) {
        return false;
      }
      return typeof reply === "number";
    })
  );

/**
 * Transform any Redis falsy response to an error
 *
 * @param response
 * @param error
 * @returns
 */
export const falsyResponseToErrorAsync = (error: Error) => (
  response: TE.TaskEither<Error, boolean>
): TE.TaskEither<Error, true> =>
  pipe(
    response,
    TE.chain(res => (res ? TE.right(res) : TE.left(error)))
  );

export const getTask = (
  redisClientFactory: RedisClientFactory,
  key: string
): TE.TaskEither<Error, O.Option<string>> =>
  pipe(
    TE.tryCatch(() => redisClientFactory.getInstance(), E.toError),
    TE.chain(redisClient => TE.tryCatch(() => redisClient.get(key), E.toError)),
    singleValueReplyAsync
  );

export const existsKeyTask = (
  redisClientFactory: RedisClientFactory,
  key: string
): TE.TaskEither<Error, boolean> =>
  pipe(
    TE.tryCatch(() => redisClientFactory.getInstance(), E.toError),
    TE.chain(redisClient =>
      TE.tryCatch(() => redisClient.EXISTS(key), E.toError)
    ),
    integerReplAsync(1)
  );

export const deleteTask = (
  redisClientFactory: RedisClientFactory,
  key: string
): TE.TaskEither<Error, boolean> =>
  pipe(
    TE.tryCatch(() => redisClientFactory.getInstance(), E.toError),
    TE.chain(redisClient => TE.tryCatch(() => redisClient.DEL(key), E.toError)),
    integerReplAsync(1)
  );

// TODO: remove this implementation if we do not need the singletone approach
// export const pingTask = (
//   redisClientTask: TE.TaskEither<Error, redis.RedisClientType>
// ): TE.TaskEither<Error, boolean> =>
//   pipe(
//     redisClientTask,
//     TE.chain(client =>
//       TE.tryCatch(
//         () => client.ping("ping message"),
//         () => new Error("Error while pinging redis")
//       )
//     ),
//     TE.map(constTrue)
//   );
