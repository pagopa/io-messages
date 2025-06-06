import { Ulid } from "@pagopa/ts-commons/lib/strings";
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
  });

  it("should decode USE_FALLBACK with true, when set to 'true'", () => {
    const p = IConfig.encode(envConfig);
    p.USE_FALLBACK = "true";
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.USE_FALLBACK).toEqual(true);
    }
  });

  it("should decode SERVICE_TO_RC_CONFIGURATION_MAP with a valid map, when set to a valid json map string", () => {
    const p = IConfig.encode(envConfig);
    p.SERVICE_TO_RC_CONFIGURATION_MAP =
      '{"one": "01ARZ3NDEKTSV4RRFFQ69G5FAV", "two": "01ARZ3NDEKTSV4RRFFQ69G5FAV"}';
    const map = new Map(
      Object.entries({
        one: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as Ulid,
        two: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as Ulid,
      }),
    );
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.SERVICE_TO_RC_CONFIGURATION_MAP).toEqual(map);
    }
  });

  it("should fail decode SERVICE_TO_RC_CONFIGURATION_MAP when set to a invvalid json map string", () => {
    const p = IConfig.encode(envConfig);
    p.SERVICE_TO_RC_CONFIGURATION_MAP =
      '{"one": ["01ARZ3NDEKTSV4RRFFQ69G5FAV", "test"], "two": "01ARZ3NDEKTSV4RRFFQ69G5FAV"}';
    const res = IConfig.decode(p);
    expect(E.isLeft(res)).toBe(true);
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
  });

  it("should decode FF_TYPE with right value, when set", () => {
    const p = IConfig.encode(envConfig);
    p.FF_TYPE = "beta";
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_TYPE).toEqual("beta");
    }
  });
});

describe("IConfig - FF_BETA_TESTER_LIST", () => {
  it("should decode FF_BETA_TESTER_LIST with empty array, when not set", () => {
    const p = IConfig.encode(envConfig);
    delete p.FF_BETA_TESTER_LIST;
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_BETA_TESTER_LIST).toEqual([]);
    }
  });

  it("should decode FF_BETA_TESTER_LIST with right value, when set", () => {
    const p = IConfig.encode(envConfig);
    p.FF_BETA_TESTER_LIST = "TEST1,TEST2";
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_BETA_TESTER_LIST).toEqual(
        p.FF_BETA_TESTER_LIST.split(","),
      );
    }
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
  });

  it("should decode FF_CANARY_USERS_REGEX with right value, when set", () => {
    const p = IConfig.encode(envConfig);
    p.FF_CANARY_USERS_REGEX = "TEST";
    const res = IConfig.decode(p);
    expect(E.isRight(res)).toBe(true);
    if (E.isRight(res)) {
      expect(res.right.FF_CANARY_USERS_REGEX).toEqual("TEST");
    }
  });
});
