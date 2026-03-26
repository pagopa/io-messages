import { describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { HealthCheckUseCase } from "../../../domain/use-cases/health";
import { getHealthHandler } from "../health";

const makeHealthCheckUseCase = (
  errors: ErrorInternal[] = [],
): HealthCheckUseCase =>
  ({
    execute: vi.fn().mockResolvedValue(errors),
  }) as unknown as HealthCheckUseCase;

describe("getHealthHandler", () => {
  test("should return ok status when all healthchecks succeed", async () => {
    const healthChecks = makeHealthCheckUseCase();
    const handler = getHealthHandler(healthChecks);

    await expect(handler()).resolves.toEqual({
      body: JSON.stringify({ status: "ok" }),
      status: 200,
    });

    expect(healthChecks.execute).toHaveBeenCalledOnce();
  });

  test("should return 500 with collected errors and ko status when a healthcheck fails", async () => {
    const errors = [
      new ErrorInternal(
        "Cosmos Healthcheck failed for database push",
        new Error("Cosmos error"),
      ),
      new ErrorInternal(
        "Healthcheck failed for notification hub",
        new Error("Notification hub error"),
      ),
    ];
    const healthChecks = makeHealthCheckUseCase(errors);
    const handler = getHealthHandler(healthChecks);

    await expect(handler()).resolves.toEqual({
      body: JSON.stringify({
        errors: [
          "Cosmos Healthcheck failed for database push Error: Cosmos error",
          "Healthcheck failed for notification hub Error: Notification hub error",
        ],
        status: "ko",
      }),
      status: 500,
    });

    expect(healthChecks.execute).toHaveBeenCalledOnce();
  });

  test("should return 500 when the use case throws", async () => {
    const healthChecks = {
      execute: vi.fn().mockRejectedValue(new Error("unexpected")),
    } as unknown as HealthCheckUseCase;
    const handler = getHealthHandler(healthChecks);

    await expect(handler()).resolves.toEqual({
      body: JSON.stringify({ error: "Could not perform health checks" }),
      status: 500,
    });
  });
});
