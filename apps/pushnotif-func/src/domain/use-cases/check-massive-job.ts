import { ErrorInternal, ErrorNotFound, ErrorTooManyRequests } from "../error";
import {
  MassiveJobID,
  MassiveJobStatus,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  MassiveProgressRepository,
  MassiveProgressStatusEnum,
} from "../massive-jobs";
import {
  NotificationDetailStatus,
  PushNotificationRepository,
  notificationDetailStatusEnum,
} from "../push-service";
import { TelemetryService } from "../telemetry";

export class CheckMassiveJobStatusUseCase {
  constructor(
    private massiveJobRepository: MassiveJobsRepository,
    private massiveProgressRepository: MassiveProgressRepository,
    private pushNotificationRepository: PushNotificationRepository,
    private telemetryClient: TelemetryService,
  ) {}

  private isNotificationFailed(
    notificationDetailState: NotificationDetailStatus,
  ) {
    return (
      notificationDetailState ===
        notificationDetailStatusEnum.enum.NoTargetFound ||
      notificationDetailState === notificationDetailStatusEnum.enum.Abandoned ||
      notificationDetailState === notificationDetailStatusEnum.enum.Unknown
    );
  }

  private isNotificationInProgress(
    notificationDetailState: NotificationDetailStatus,
  ) {
    return (
      notificationDetailState ===
        notificationDetailStatusEnum.enum.Processing ||
      notificationDetailState === notificationDetailStatusEnum.enum.Enqueued
    );
  }

  private async setMassiveJobStatus(
    massiveJobID: MassiveJobID,
    newStatus: MassiveJobStatus,
  ): Promise<ErrorInternal | ErrorNotFound | MassiveJobStatus> {
    const patchResult = await this.massiveJobRepository.setStatus(
      massiveJobID,
      newStatus,
    );

    if (patchResult instanceof Error) {
      // The patchResult can be of type ErrorNotFound but here we already
      // know that this cannot be possible since we already obtained the
      // massive job at the top of the execute, we can ignore this case here then.
      return patchResult;
    }

    return MassiveJobStatusEnum.enum.COMPLETED;
  }

  async execute(
    jobID: MassiveJobID,
  ): Promise<ErrorInternal | MassiveJobStatus> {
    const massiveJob = await this.massiveJobRepository.getMassiveJob(jobID);

    if (massiveJob instanceof Error) {
      return massiveJob;
    }

    // If the massive job is not in progress, we do not need to check anything.
    if (!(massiveJob.status === MassiveJobStatusEnum.enum.PROCESSING)) {
      return massiveJob.status;
    }

    const massivePendingProgress =
      await this.massiveProgressRepository.listMassiveJobPendingProgress(jobID);

    if (massivePendingProgress instanceof ErrorInternal) {
      return massivePendingProgress;
    }

    // For each pending progress we can use the `id` to check the notification status.
    for (const progress of massivePendingProgress) {
      const notificationDetails =
        await this.pushNotificationRepository.getMassiveNotificationDetail(
          progress.id,
          progress.tags[0],
        );

      if (notificationDetails instanceof ErrorNotFound) {
        // TODO: Find a better name.
        this.telemetryClient.trackEvent("massiveJobs.notificationNotFound", {
          cause: notificationDetails.cause,
          message: notificationDetails.message,
          name: notificationDetails.name,
        });

        const setStatusResponse =
          await this.massiveProgressRepository.setStatus(
            progress.id,
            jobID,
            MassiveProgressStatusEnum.enum.FAILED,
          );

        if (setStatusResponse instanceof Error) {
          return setStatusResponse;
        }

        // Once we set the status to FAILED, we can skip this iteration and go
        // to the next progress.
        continue;
      }

      if (
        notificationDetails instanceof ErrorInternal ||
        notificationDetails instanceof ErrorTooManyRequests
      ) {
        // In this case we want the handler to trigger a retry.
        return new ErrorInternal(
          notificationDetails.name,
          notificationDetails.cause,
        );
      }

      if (this.isNotificationInProgress(notificationDetails.state)) {
        // If the notification is still in `Processing` state we throw an
        // exception, this way we trigger a retry.
        //
        // We assume that if the notification is still in progress after 5 retry
        // there is a problem and a human check is needed. The message will be
        // pushed in the poison triggering an alert.
        return new ErrorInternal(
          `Notification with id ${notificationDetails.notificationId} still in state ${notificationDetails.state}`,
        );
      }

      // Here we can ignore the Canceled state since this is handled by the
      // CancelMassiveJob function.
      if (this.isNotificationFailed(notificationDetails.state)) {
        const setStatusResponse =
          await this.massiveProgressRepository.setStatus(
            progress.id,
            jobID,
            MassiveProgressStatusEnum.enum.FAILED,
          );

        if (
          setStatusResponse instanceof ErrorInternal ||
          setStatusResponse instanceof ErrorTooManyRequests
        ) {
          // In this case we want the handler to trigger a retry.
          return new ErrorInternal(
            setStatusResponse.name,
            setStatusResponse.cause,
          );
        }

        // Once we set the status to FAILED, we can skip this iteration and go
        // to the next progress.
        continue;
      }

      if (
        notificationDetails.state ===
        notificationDetailStatusEnum.enum.Completed
      ) {
        const setStatusResponse =
          await this.massiveProgressRepository.setStatus(
            progress.id,
            jobID,
            MassiveProgressStatusEnum.enum.SENT,
          );

        if (
          setStatusResponse instanceof ErrorInternal ||
          setStatusResponse instanceof ErrorTooManyRequests
        ) {
          // In this case we want the handler to trigger a retry.
          return new ErrorInternal(
            setStatusResponse.name,
            setStatusResponse.cause,
          );
        }
      }
    }

    // At this point we know that all the progress are updated, we consider the
    // entire job to be completed.
    const updateResult = await this.setMassiveJobStatus(
      massiveJob.id,
      MassiveJobStatusEnum.enum.COMPLETED,
    );

    if (updateResult instanceof ErrorInternal) {
      return updateResult;
    }

    return MassiveJobStatusEnum.enum.COMPLETED;
  }
}
