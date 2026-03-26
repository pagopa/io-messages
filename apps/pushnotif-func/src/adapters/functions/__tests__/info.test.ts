import { describe, expect, test, vi } from "vitest";

import { InfoUseCase } from "../../../domain/use-cases/info";
import { getInfoHandler } from "../info";

const makeInfoUseCase = (
  pkg = { name: "pushnotif-func", version: "2.3.4" },
): InfoUseCase =>
  ({ execute: vi.fn().mockResolvedValue(pkg) }) as unknown as InfoUseCase;

describe("getInfoHandler", () => {
  test("should return package name and version when the use case resolves", async () => {
    const infoUseCase = makeInfoUseCase();
    const handler = getInfoHandler(infoUseCase);

    await expect(handler()).resolves.toEqual({
      body: JSON.stringify({ name: "pushnotif-func", version: "2.3.4" }),
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

    expect(infoUseCase.execute).toHaveBeenCalledOnce();
  });

  test("should return 500 when the use case throws", async () => {
    const infoUseCase = {
      execute: vi.fn().mockRejectedValue(new Error("missing file")),
    } as unknown as InfoUseCase;
    const handler = getInfoHandler(infoUseCase);

    await expect(handler()).resolves.toEqual({
      body: JSON.stringify({ error: "Could not read function info" }),
      status: 500,
    });
  });
});
