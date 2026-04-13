import { TelemetryService } from "@/domain/telemetry";
import { CheckMassiveJobStatusUseCase } from "@/domain/use-cases/check-massive-job";
import { StorageQueueHandler } from "@azure/functions";
import { z } from "zod";

import { ErrorInternal } from "../../domain/error";
import { massiveJobIDSchema } from "../../domain/massive-jobs";

const checkNotificationStatusMessageSchema = z.object({
  jobId: massiveJobIDSchema,
});

export const getCheckMassiveJobHandler =
  (
    telemetryService: TelemetryService,
    checkMassiveJobStatusUseCase: CheckMassiveJobStatusUseCase,
  ): StorageQueueHandler =>
  async (message) => {
    const checkNotificationStatusMessage =
      checkNotificationStatusMessageSchema.safeParse(message);
    if (!checkNotificationStatusMessage.success) {
      // TODO: find a standard for event names.
      telemetryService.trackEvent(
        "massiveJobs.invalidCheckNotificationStatusMessage",
        { issues: checkNotificationStatusMessage.error.issues },
      );

      return;
    }

    const massiveJob = await checkMassiveJobStatusUseCase.execute(
      checkNotificationStatusMessage.data.jobId,
    );

    if (massiveJob instanceof ErrorInternal) {
      throw massiveJob;
    }
  };
