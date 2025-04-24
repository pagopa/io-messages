import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { isRight } from "fp-ts/lib/Either";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { envConfig } from "../../__mocks__/env.mock";
import { IConfig } from "../config";

const aConfig = { ...envConfig, isProduction: false };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IConfig", () => {
  it.each`
    ff
    ${"all"}
    ${"none"}
    ${"beta"}
    ${"canary"}
  `("should deserialize config with $ff user subset", ({ ff }) => {
    const decoded = pipe(
      {
        ...aConfig,
        NH_PARTITION_FEATURE_FLAG: ff,
      },
      IConfig.decode,
      E.getOrElseW((e) => {
        throw new Error(`Cannot decode config, ${readableReport(e)}`);
      }),
    );

    expect(typeof decoded).toBe("object");
  });

  it("should throw error with wrong FF inputs", () => {
    const decoded = IConfig.decode({
      ...aConfig,
      NH_PARTITION_FEATURE_FLAG: "wrong",
    });

    expect(isRight(decoded)).toBe(false);
  });

  it("should not override computed value for AZURE_NOTIFICATION_HUB_PARTITIONS", () => {
    const config = pipe(
      {
        ...aConfig,
        AZURE_NOTIFICATION_HUB_PARTITIONS: "any value",
      },
      IConfig.decode,
      E.getOrElseW((e) => {
        throw new Error(`Cannot decode config, ${readableReport(e)}`);
      }),
    );

    expect(config.AZURE_NOTIFICATION_HUB_PARTITIONS).toEqual(expect.any(Array));
    expect(config.AZURE_NOTIFICATION_HUB_PARTITIONS).not.toBe("any value");
  });
});
