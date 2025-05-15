import { isNone } from "fp-ts/lib/Option";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { RedisClientType } from "redis";
import { assert, describe, expect, it, vi } from "vitest";

import { RedisClientFactory } from "../redis";
import { getTask, setWithExpirationTask } from "../redis_storage";

const aRedisKey = "KEY";
const aRedisValue = "VALUE";
const aRedisDefaultExpiration = 10;

const setMock = vi
  .fn()
  .mockImplementation((_, __, ___, ____, cb) => cb(undefined, "OK"));
const setExMock = vi.fn();
const getMock = vi.fn();
const redisClientMock = {
  get: getMock,
  set: setMock,
  setEx: setExMock,
} as unknown as RedisClientType;

const redisClientFactoryMock = {
  getInstance: async () => redisClientMock,
} as RedisClientFactory;

describe("setWithExpirationTask", () => {
  it("should return true if redis store key-value pair correctly", async () => {
    setExMock.mockReturnValueOnce(Promise.resolve("OK"));
    expect.assertions(1);
    await pipe(
      setWithExpirationTask(
        redisClientFactoryMock,
        aRedisKey,
        aRedisValue,
        aRedisDefaultExpiration,
      ),
      TE.map((value) => expect(value).toEqual(true)),
    )();
  });

  it("should return an error if redis store key-value pair assert.fails", async () => {
    setExMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      setWithExpirationTask(
        redisClientFactoryMock,
        aRedisKey,
        aRedisValue,
        aRedisDefaultExpiration,
      ),
      TE.mapLeft((error) => expect(error).toBeInstanceOf(Error)),
    )();
  });
});

describe("getTask", () => {
  it("should return a value if redis get key-value pair correctly", async () => {
    getMock.mockReturnValueOnce(Promise.resolve(aRedisValue));
    expect.assertions(1);
    await pipe(
      getTask(redisClientFactoryMock, aRedisKey),
      TE.map(
        O.fold(
          () => assert.fail(),
          (value) => expect(value).toEqual(aRedisValue),
        ),
      ),
    )();
  });

  it("should return none if no value was found for the provided key", async () => {
    getMock.mockReturnValueOnce(Promise.resolve(undefined));
    expect.assertions(1);
    await pipe(
      getTask(redisClientFactoryMock, aRedisKey),
      TE.map((maybeResult) => expect(isNone(maybeResult)).toBeTruthy()),
    )();
  });

  it("should return an error if redis get value assert.fails", async () => {
    getMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      getTask(redisClientFactoryMock, aRedisKey),
      TE.mapLeft((error) => expect(error).toBeInstanceOf(Error)),
    )();
  });
});
