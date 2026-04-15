import {
  ErrorInternal,
  ErrorNotAccepted,
  ErrorNotFound,
  ErrorTooManyRequests,
} from "../error";
import {
  CancelMassiveJobResult,
  MassiveJobID,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  MassiveProgress,
  MassiveProgressRepository,
  MassiveProgressStatusEnum,
} from "../massive-jobs";
import { PushNotificationRepository } from "../push-service";

export class CancelMassiveNotificationJobUseCase {
  constructor(
    private readonly massiveJobRepository: MassiveJobsRepository,
    private readonly massiveProgressRepository: MassiveProgressRepository,
    private readonly pushNotificationRepository: PushNotificationRepository,
  ) {}

  private async cancelSheduledNotification(
    progress: MassiveProgress,
    jobId: MassiveJobID,
  ): Promise<ErrorInternal | ErrorTooManyRequests | string> {
    const cancelResult =
      await this.pushNotificationRepository.cancelScheduledNotification(
        progress.id,
        progress.tags[0],
      );

    if (
      cancelResult instanceof ErrorInternal ||
      cancelResult instanceof ErrorTooManyRequests
    ) {
      return cancelResult;
    }

    // In case of ErrorNotFound we mark the progress as FAILED continuing with the cancellation of the rest of notifications and the job,
    // since the notification is already not scheduled.
    // In case of success we mark it as CANCELED
    const newStatus =
      cancelResult instanceof ErrorNotFound
        ? MassiveProgressStatusEnum.enum.FAILED
        : MassiveProgressStatusEnum.enum.CANCELED;

    const setStatusResult = await this.massiveProgressRepository.setStatus(
      progress.id,
      jobId,
      newStatus,
    );

    if (setStatusResult instanceof Error) {
      return setStatusResult;
    }

    return newStatus;
  }

  async execute(
    jobId: MassiveJobID,
  ): Promise<
    CancelMassiveJobResult | ErrorInternal | ErrorNotAccepted | ErrorNotFound
  > {
    const massiveJob = await this.massiveJobRepository.getMassiveJob(jobId);

    if (massiveJob instanceof Error) {
      return massiveJob;
    }

    if (massiveJob.status !== MassiveJobStatusEnum.enum.PROCESSING) {
      return new ErrorNotAccepted(
        `Jobs with status '${massiveJob.status}' cannot be canceled`,
      );
    }

    const pendingProgress =
      await this.massiveProgressRepository.listMassiveJobPendingProgress(
        massiveJob.id,
      );

    if (pendingProgress instanceof Error) {
      return pendingProgress;
    }

    for (const progress of pendingProgress) {
      const cancelResult = await this.cancelSheduledNotification(
        progress,
        massiveJob.id,
      );
      if (cancelResult instanceof Error) {
        return cancelResult;
      }
    }

    const setJobStatusResult = await this.massiveJobRepository.setStatus(
      massiveJob.id,
      MassiveJobStatusEnum.enum.CANCELED,
    );

    if (setJobStatusResult instanceof Error) {
      return setJobStatusResult;
    }

    return { jobId: massiveJob.id, status: MassiveJobStatusEnum.enum.CANCELED };
  }
}
