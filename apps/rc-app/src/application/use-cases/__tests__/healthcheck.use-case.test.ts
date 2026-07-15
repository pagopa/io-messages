import { GenericError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";

import type { AppHealthchecker } from "../../ports/app-healthcheck.js";

import { makeHealthcheckUseCase } from "../healthcheck.use-case.js";

describe("makeHealthcheckUseCase", () => {
  it("returns an empty failures array when all healthchecks are ok", async () => {
    const healthchecks: AppHealthchecker[] = [
      { health: () => Promise.resolve(ok(undefined)) },
    ];

    const result = await makeHealthcheckUseCase(healthchecks)({});

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ failures: [] });
  });

  it("returns only GenericError messages from failing healthchecks", async () => {
    const dbError = new GenericError("db unavailable");
    const cacheError = new GenericError("cache timeout");

    const healthchecks: AppHealthchecker[] = [
      { health: () => Promise.resolve(ok(undefined)) },
      { health: () => Promise.resolve(err(dbError)) },
      { health: () => Promise.resolve(err(cacheError)) },
    ];

    const result = await makeHealthcheckUseCase(healthchecks)({});

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      failures: [
        "Generic error: db unavailable",
        "Generic error: cache timeout",
      ],
    });
  });
});
