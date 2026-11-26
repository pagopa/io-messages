import { GenericError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import { makeGetInfoUseCase } from "../info.use-case.js";

describe("makeGetInfoUseCase", () => {
  it("returns app metadata from the reader", async () => {
    const result = ok({ name: "messages-func", version: "1.2.3" });
    const getAppInfo = vi.fn().mockResolvedValue(result);

    await expect(makeGetInfoUseCase({ getAppInfo })({})).resolves.toBe(result);
    expect(getAppInfo).toHaveBeenCalledExactlyOnceWith();
  });

  it("passes through the reader error", async () => {
    const result = err(new GenericError("Unable to read package.json"));
    const getAppInfo = vi.fn().mockResolvedValue(result);

    await expect(makeGetInfoUseCase({ getAppInfo })({})).resolves.toBe(result);
    expect(getAppInfo).toHaveBeenCalledExactlyOnceWith();
  });
});
