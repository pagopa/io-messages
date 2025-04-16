import * as E from "fp-ts/lib/Either";
import { describe, expect, it } from "vitest";

import { envConfig } from "../../__mocks__/env-config.mock";
import { IConfig } from "../config";

describe("IConfig - USE_FALLBACK", () => {
  it("should decode USE_FALLBACK with defalt, when is not defined", () => {
    const p = IConfig.encode(envConfig);
    delete p.USE_FALLBACK;
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.USE_FALLBACK).toEqual(false);
    }
    expect.assertions(2);
  });

  it("should decode USE_FALLBACK with true, when set to 'true'", () => {
    const p = IConfig.encode(envConfig);
    p.USE_FALLBACK = "true";
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.USE_FALLBACK).toEqual(true);
    }
    expect.assertions(2);
  });
});

describe("IConfig - FF_TYPE", () => {
  it("should decode FF_TYPE with defalt, when is not defined", () => {
    const p = IConfig.encode(envConfig);
    delete p.FF_TYPE;
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_TYPE).toEqual("none");
    }
    expect.assertions(2);
  });

  it("should decode FF_TYPE with right value, when set", () => {
    const p = IConfig.encode(envConfig);
    p.FF_TYPE = "beta";
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_TYPE).toEqual(p.FF_TYPE);
    }
    expect.assertions(2);
  });
});

describe("IConfig - FF_BETA_TESTERS", () => {
  it("should decode FF_BETA_TESTERS with empty array, when not set", () => {
    const p = IConfig.encode(envConfig);
    delete p.FF_BETA_TESTERS;
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_BETA_TESTERS).toEqual([]);
    }
    expect.assertions(2);
  });

  it("should decode FF_BETA_TESTERS with right value, when set", () => {
    const p = IConfig.encode(envConfig);
    p.FF_BETA_TESTERS = "TEST1,TEST2";
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_BETA_TESTERS).toEqual(p.FF_BETA_TESTERS.split(","));
    }
    expect.assertions(2);
  });
});

describe("IConfig - FF_CANARY_USERS_REGEX", () => {
  it("should decode FF_CANARY_USERS_REGEX with XYZ string, when not set", () => {
    const p = IConfig.encode(envConfig);
    delete p.FF_CANARY_USERS_REGEX;
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_CANARY_USERS_REGEX).toEqual("XYZ");
    }
    expect.assertions(2);
  });

  it("should decode FF_CANARY_USERS_REGEX with right value, when set", () => {
    const p = IConfig.encode(envConfig);
    p.FF_CANARY_USERS_REGEX = "TEST";
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_CANARY_USERS_REGEX).toEqual(p.FF_CANARY_USERS_REGEX);
    }
    expect.assertions(2);
  });
});
