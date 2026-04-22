import { ErrorInternal } from "../error";
import {
  MassiveJobID,
  MassiveNotificationMessage,
  MassiveNotificationTags,
  MassiveNotificationTitle,
  MassiveProgressRepository,
  MassiveProgressStatusEnum,
} from "../massive-jobs";
import { PushNotificationRepository } from "../push-service";
import { TelemetryService } from "../telemetry";

export class ProcessMassiveJobUseCase {
  constructor(
    private massiveProgressRepository: MassiveProgressRepository,
    private pushNotificationRepository: PushNotificationRepository,
  ) {}

  async execute(
    jobId: MassiveJobID,
    title: MassiveNotificationTitle,
    message: MassiveNotificationMessage,
    scheduledTimestamp: number,
    tags: MassiveNotificationTags,
    telemetryService: TelemetryService,
  ): Promise<ErrorInternal | string[]> {
    const scheduledNotificationIds =
      await this.pushNotificationRepository.scheduleMassiveNotification(
        title,
        message,
        scheduledTimestamp,
        tags,
      );

    if (scheduledNotificationIds instanceof Error) {
      return scheduledNotificationIds;
    }

    const massiveProgress = scheduledNotificationIds.map(
      (scheduledNotification) => ({
        id: scheduledNotification.notificationID,
        jobId,
        scheduledTimestamp,
        status: MassiveProgressStatusEnum.enum.PENDING,
        tags: scheduledNotification.tags,
      }),
    );

    // TODO: Check if we can use batch operation here.
    for (const progress of massiveProgress) {
      const createResult =
        await this.massiveProgressRepository.create(progress);

      if (createResult instanceof ErrorInternal) {
        // In this case we want to ignore the error by simply tracking an event,
        // triggering a retry here would mean sending duplicates to users.
        telemetryService.trackEvent({
          name: "massiveJob.ProcessMassiveJob.progress.create.failed",
          properties: {
            errorCause: createResult.cause,
            errorKind: createResult.constructor.name,
            jobId,
            notificationId: progress.id,
            scheduledTimestamp,
            tags: progress.tags,
          },
        });
        continue;
      }
    }

    return massiveProgress.map((progress) => progress.id);
  }
}
