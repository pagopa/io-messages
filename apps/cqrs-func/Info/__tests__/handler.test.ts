import * as TE from "fp-ts/lib/TaskEither";
import { HealthCheck, HealthProblem } from "../../utils/healthcheck";
import { InfoHandler } from "../handler";
import { vi, describe, test, expect, afterEach } from "vitest";

afterEach(() => {
  vi.clearAllMocks();
});

describe("InfoHandler", () => {
  test("should return an internal error if the application is not healthy", async () => {
    const healthCheck: HealthCheck = TE.left([
      "failure 1" as HealthProblem<"Config">,
      "failure 2" as HealthProblem<"Config">
    ]);
    const handler = InfoHandler(healthCheck);

    const response = await handler();

    expect(response.kind).toBe("IResponseErrorInternal");
  });

  test("should return a success if the application is healthy", async () => {
    const healthCheck: HealthCheck = TE.of(true);
    const handler = InfoHandler(healthCheck);

    const response = await handler();

    expect(response.kind).toBe("IResponseSuccessJson");
  });
});
