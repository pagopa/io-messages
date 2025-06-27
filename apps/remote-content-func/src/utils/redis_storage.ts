import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { RedisClientFactory } from "./redis";

/**
 * Parse a Redis single string reply.
 *
 * @see https://redis.io/topics/protocol#simple-string-reply.
 */
const singleStringReplyAsync = (
  command: TE.TaskEither<Error, null | string>,
): TE.TaskEither<Error, boolean> =>
  pipe(
    command,
    TE.map((reply) => reply === "OK"),
  );

/**
 * Parse a Redis single string reply.
 *
 * @see https://redis.io/topics/protocol#simple-string-reply.
 */
const singleValueReplyAsync = (
  command: TE.TaskEither<Error, null | string>,
): TE.TaskEither<Error, O.Option<string>> =>
  pipe(command, TE.map(O.fromNullable));

/**
 * Transform any Redis falsy response to an error
 *
 * @param response
 * @param error
 * @returns
 */
const falsyResponseToErrorAsync =
  (error: Error) =>
  (response: TE.TaskEither<Error, boolean>): TE.TaskEither<Error, true> =>
    pipe(
      response,
      TE.chain((res) => (res ? TE.right(res) : TE.left(error))),
    );

export const setWithExpirationTask = (
  redisClientFactory: RedisClientFactory,
  key: string,
  value: string,
  expirationInSeconds: number,
  errorMsg?: string,
): TE.TaskEither<Error, true> =>
  pipe(
    TE.tryCatch(() => redisClientFactory.getInstance(), E.toError),
    TE.chain((redisClient) =>
      TE.tryCatch(
        () => redisClient.SETEX(key, expirationInSeconds, value),
        E.toError,
      ),
    ),
    singleStringReplyAsync,
    falsyResponseToErrorAsync(
      new Error(errorMsg ? errorMsg : "Error setting key value pair on redis"),
    ),
  );

export const getTask = (
  redisClientFactory: RedisClientFactory,
  key: string,
): TE.TaskEither<Error, O.Option<string>> =>
  pipe(
    TE.tryCatch(() => redisClientFactory.getInstance(), E.toError),
    TE.chain((redisClient) =>
      TE.tryCatch(() => redisClient.GET(key), E.toError),
    ),
    singleValueReplyAsync,
  );
