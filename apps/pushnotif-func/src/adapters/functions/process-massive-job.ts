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
      // TODO: find a standard for event names.
      telemetryService.trackEvent(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        { issues: checkNotificationStatusMessage.error.issues },
      );

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
      telemetryService.trackEvent("massiveJobs.process", {
        cause: progressIDs.cause,
        message: progressIDs.message,
        name: progressIDs.name,
      });

      return;
    }
  };
