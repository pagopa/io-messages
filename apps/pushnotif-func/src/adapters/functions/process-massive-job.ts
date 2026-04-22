import { TelemetryService } from "@/domain/telemetry";
import { ProcessMassiveJobUseCase } from "@/domain/use-cases/process-massive-job";
import { StorageQueueHandler } from "@azure/functions";
import { z } from "zod";

import { ErrorInternal } from "../../domain/error";
import {
  massiveJobIDSchema,
  massiveNotificationMessageSchema,
  massiveNotificationTagsSchema,
  massiveNotificationTitleSchema,
} from "../../domain/massive-jobs";

const processMassiveNotificationMessageSchema = z.object({
  body: massiveNotificationMessageSchema,
  jobId: massiveJobIDSchema,
  scheduledTimestamp: z.number().int().positive(),
  tags: massiveNotificationTagsSchema,
  title: massiveNotificationTitleSchema,
});

export const makeProcessMassiveJobHandler =
  (
    telemetryService: TelemetryService,
    processMassiveJobUseCase: ProcessMassiveJobUseCase,
  ): StorageQueueHandler =>
  async (message) => {
    const checkNotificationStatusMessage =
      processMassiveNotificationMessageSchema.safeParse(message);

    if (!checkNotificationStatusMessage.success) {
      telemetryService.trackEvent({
        name: "massiveJob.ProcessMassiveJob.queueMessage.invalid",
        properties: {
          issues: checkNotificationStatusMessage.error.issues,
          rawMessage: message,
        },
      });

      return;
    }

    const progressIDs = await processMassiveJobUseCase.execute(
      checkNotificationStatusMessage.data.jobId,
      checkNotificationStatusMessage.data.title,
      checkNotificationStatusMessage.data.body,
      checkNotificationStatusMessage.data.scheduledTimestamp,
      checkNotificationStatusMessage.data.tags,
      telemetryService,
    );

    if (progressIDs instanceof ErrorInternal) {
      telemetryService.trackEvent({
        name: "massiveJob.ProcessMassiveJob.failed",
        properties: {
          errorCause: progressIDs.cause,
          errorKind: progressIDs.constructor.name,
          jobId: checkNotificationStatusMessage.data.jobId,
          scheduledTimestamp:
            checkNotificationStatusMessage.data.scheduledTimestamp,
          tags: checkNotificationStatusMessage.data.tags,
        },
      });

      return;
    }
  };
