import { TelemetryService } from "@/domain/telemetry";
import { CheckMassiveJobStatusUseCase } from "@/domain/use-cases/check-massive-job";
import { StorageQueueHandler } from "@azure/functions";
import { z } from "zod";

import { ErrorInternal, ErrorNotFound } from "../../domain/error";
import { massiveJobIDSchema } from "../../domain/massive-jobs";

const checkNotificationStatusMessageSchema = z.object({
  jobId: massiveJobIDSchema,
});

export const makeCheckMassiveJobHandler =
  (
    telemetryService: TelemetryService,
    checkMassiveJobStatusUseCase: CheckMassiveJobStatusUseCase,
  ): StorageQueueHandler =>
  async (message) => {
    const checkNotificationStatusMessage =
      checkNotificationStatusMessageSchema.safeParse(message);
    if (!checkNotificationStatusMessage.success) {
      telemetryService.trackEvent({
        name: "massiveJob.CheckMassiveJob.queueMessage.invalid",
        properties: {
          issues: checkNotificationStatusMessage.error.issues,
          rawMessage: message,
        },
      });

      return;
    }

    const massiveJob = await checkMassiveJobStatusUseCase.execute(
      checkNotificationStatusMessage.data.jobId,
    );

    if (massiveJob instanceof ErrorNotFound) {
      telemetryService.trackEvent({
        name: "massiveJob.CheckMassiveJob.notFound",
        properties: { jobId: checkNotificationStatusMessage.data.jobId },
      });
    }

    if (massiveJob instanceof ErrorInternal) {
      throw massiveJob;
    }
  };
