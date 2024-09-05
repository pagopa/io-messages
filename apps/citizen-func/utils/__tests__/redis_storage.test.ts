// tslint:disable: no-any
import { pipe } from "fp-ts/lib/function";
import { isNone } from "fp-ts/lib/Option";
import { getTask, setTask, setWithExpirationTask } from "../redis_storage";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import { RedisClientType } from "redis";
import { RedisClientFactory } from "../redis";

const aRedisKey = "KEY";
const aRedisValue = "VALUE";
const aRedisDefaultExpiration = 10;

const setMock = jest
  .fn()
  .mockImplementation((_, __, ___, ____, cb) => cb(undefined, "OK"));
const setExMock = jest.fn();
const getMock = jest.fn();
const redisClientMock = ({
  get: getMock,
  set: setMock,
  setEx: setExMock
} as unknown) as RedisClientType;

const redisClientFactoryMock = {
  getInstance: async () => redisClientMock
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
        aRedisDefaultExpiration
      ),
      TE.map(value => expect(value).toEqual(true))
    )();
  });

  it("should return an error if redis store key-value pair fails", async () => {
    setExMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      setWithExpirationTask(
        redisClientFactoryMock,
        aRedisKey,
        aRedisValue,
        aRedisDefaultExpiration
      ),
      TE.mapLeft(error => expect(error).toBeInstanceOf(Error))
    )();
  });
});

describe("setTask", () => {
  it("should return true if redis store key-value pair correctly", async () => {
    setMock.mockReturnValueOnce(Promise.resolve("OK"));
    expect.assertions(1);
    await pipe(
      setTask(redisClientFactoryMock, aRedisKey, aRedisValue),
      TE.map(value => expect(value).toEqual(true))
    )();
  });

  it("should return an error if redis store key-value pair fails", async () => {
    setMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      setTask(redisClientFactoryMock, aRedisKey, aRedisValue),
      TE.mapLeft(error => expect(error).toBeInstanceOf(Error))
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
          () => fail(),
          value => expect(value).toEqual(aRedisValue)
        )
      )
    )();
  });

  it("should return none if no value was found for the provided key", async () => {
    getMock.mockReturnValueOnce(Promise.resolve(undefined));
    expect.assertions(1);
    await pipe(
      getTask(redisClientFactoryMock, aRedisKey),
      TE.map(maybeResult => expect(isNone(maybeResult)).toBeTruthy())
    )();
  });

  it("should return an error if redis get value fails", async () => {
    getMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      getTask(redisClientFactoryMock, aRedisKey),
      TE.mapLeft(error => expect(error).toBeInstanceOf(Error))
    )();
  });
});
