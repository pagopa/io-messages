import { HealthProblem } from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import * as TE from "fp-ts/lib/TaskEither";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthCheck } from "../../../utils/healthcheck";
import { InfoHandler } from "../handler";

afterEach(() => {
  vi.clearAllMocks();
});

describe("InfoHandler", () => {
  it("should return an internal error if the application is not healthy", async () => {
    const mockHealthCheckFailure: HealthCheck = TE.left([]);
    const handler = InfoHandler(mockHealthCheckFailure);

    const response = await handler();

    expect(response.kind).toBe("IResponseErrorInternal");
  });

  it("should return a success if the application is healthy", async () => {
    const mockHealthCheckSuccess: HealthCheck = TE.right(true);
    const handler = InfoHandler(mockHealthCheckSuccess);

    const response = await handler();

    expect(response.kind).toBe("IResponseSuccessJson");
  });
});
