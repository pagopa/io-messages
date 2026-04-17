import { InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { massiveJobIDSchema } from "../../../domain/massive-jobs";
import { TelemetryService } from "../../../domain/telemetry";
import { CheckMassiveJobStatusUseCase } from "../../../domain/use-cases/check-massive-job";
import { makeCheckMassiveJobHandler } from "../check-massive-job";

const validJobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");

const telemetryServiceMock: TelemetryService = {
  trackEvent: vi.fn(),
};

const useCaseMock: Pick<CheckMassiveJobStatusUseCase, "execute"> = {
  execute: vi.fn(),
};

const context = new InvocationContext();

const handler = makeCheckMassiveJobHandler(
  telemetryServiceMock,
  useCaseMock as CheckMassiveJobStatusUseCase,
);

describe("getCheckMassiveJobHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should track telemetry and skip execution when the queue payload is invalid", async () => {
    await handler({ jobId: "invalid-id" }, context);

    expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
      "massiveJobs.invalidCheckNotificationStatusMessage",
      { issues: expect.any(Array) },
    );
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("should call the use case with the parsed job id when the payload is valid", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce("COMPLETED");

    await handler({ jobId: validJobId }, context);

    expect(useCaseMock.execute).toHaveBeenCalledWith(validJobId);
    expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
  });

  test("should throw when the use case returns ErrorInternal", async () => {
    const internalError = new ErrorInternal("Unexpected error");
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(internalError);

    await expect(handler({ jobId: validJobId }, context)).rejects.toBe(
      internalError,
    );
    expect(useCaseMock.execute).toHaveBeenCalledWith(validJobId);
  });
});
