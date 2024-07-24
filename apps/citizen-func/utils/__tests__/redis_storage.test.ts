// tslint:disable: no-any
import { pipe } from "fp-ts/lib/function";
import { isNone } from "fp-ts/lib/Option";
import {
  deleteTask,
  getTask,
  setTask,
  setWithExpirationTask
} from "../redis_storage";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";

const aRedisKey = "KEY";
const aRedisValue = "VALUE";
const aRedisDefaultExpiration = 10;

const setMock = jest
  .fn()
  .mockImplementation((_, __, ___, ____, cb) => cb(undefined, "OK"));
const getMock = jest.fn();
const delMock = jest.fn();
const redisClientMock = {
  get: getMock,
  set: setMock,
  del: delMock
};

describe("setWithExpirationTask", () => {
  it("should return true if redis store key-value pair correctly", async () => {
    setMock.mockReturnValueOnce(Promise.resolve(aRedisValue));
    expect.assertions(1);
    await pipe(
      setWithExpirationTask(
        redisClientMock as any,
        aRedisKey,
        aRedisValue,
        aRedisDefaultExpiration
      ),
      TE.map(value => expect(value).toEqual(true))
    )();
  });

  it("should return an error if redis store key-value pair fails", async () => {
    setMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      setWithExpirationTask(
        redisClientMock as any,
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
    setMock.mockReturnValueOnce(Promise.resolve(aRedisValue));
    expect.assertions(1);
    await pipe(
      setTask(redisClientMock as any, aRedisKey, aRedisValue),
      TE.map(value => expect(value).toEqual(true))
    )();
  });

  it("should return an error if redis store key-value pair fails", async () => {
    setMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      setTask(redisClientMock as any, aRedisKey, aRedisValue),
      TE.mapLeft(error => expect(error).toBeInstanceOf(Error))
    )();
  });
});

describe("getTask", () => {
  it("should return a value if redis get key-value pair correctly", async () => {
    getMock.mockReturnValueOnce(Promise.resolve(aRedisValue));
    expect.assertions(1);
    await pipe(
      getTask(redisClientMock as any, aRedisKey),
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
      getTask(redisClientMock as any, aRedisKey),
      TE.map(maybeResult => expect(isNone(maybeResult)).toBeTruthy())
    )();
  });

  it("should return an error if redis get value fails", async () => {
    getMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      getTask(redisClientMock as any, aRedisKey),
      TE.mapLeft(error => expect(error).toBeInstanceOf(Error))
    )();
  });
});

describe("deleteTask", () => {
  it("should return true if redis delete key-value pair correctly", async () => {
    delMock.mockReturnValueOnce(Promise.resolve(true));
    expect.assertions(1);
    await pipe(
      deleteTask(redisClientMock as any, aRedisKey),
      TE.map(x => expect(x).toBe(true))
    )();
  });

  it("should return 0 if no key was found for delete", async () => {
    // when no key is found then 0 is returned as the number of records deleted
    delMock.mockReturnValueOnce(Promise.resolve(0));
    expect.assertions(1);
    await pipe(
      deleteTask(redisClientMock as any, aRedisKey),
      TE.map(value => expect(value).toBe(true))
    )();
  });

  it("should return an error if redis get value fails", async () => {
    delMock.mockReturnValueOnce(Promise.reject({}));
    expect.assertions(1);
    await pipe(
      deleteTask(redisClientMock as any, aRedisKey),
      TE.mapLeft(error => expect(error).toBeInstanceOf(Error))
    )();
  });
});
