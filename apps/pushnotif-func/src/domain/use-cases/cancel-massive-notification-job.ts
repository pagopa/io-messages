import { ErrorConflict, ErrorInternal, ErrorNotFound } from "../error";
import {
  CancelMassiveJobResult,
  MassiveJobID,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  MassiveProgressRepository,
  MassiveProgressStatusEnum,
} from "../massive-jobs";
import { PushNotificationRepository } from "../push-service";

export class CancelMassiveNotificationJobUseCase {
  constructor(
    private massiveJobRepository: MassiveJobsRepository,
    private massiveProgressRepository: MassiveProgressRepository,
    private pushNotificationRepository: PushNotificationRepository,
  ) {}

  async execute(
    jobId: MassiveJobID,
  ): Promise<
    CancelMassiveJobResult | ErrorConflict | ErrorInternal | ErrorNotFound
  > {
    const massiveJob = await this.massiveJobRepository.getMassiveJob(jobId);

    if (massiveJob instanceof Error) {
      return massiveJob;
    }

    if (massiveJob.status !== MassiveJobStatusEnum.enum.PROCESSING) {
      return new ErrorConflict(
        `Jobs with status '${massiveJob.status}' cannot be canceled`,
      );
    }

    const pendingProgress =
      await this.massiveProgressRepository.listMassiveJobPendingProgress(jobId);

    if (pendingProgress instanceof Error) {
      return pendingProgress;
    }

    for (const progress of pendingProgress) {
      const cancelResult =
        await this.pushNotificationRepository.cancelScheduledNotification(
          progress.id,
          progress.tags[0],
        );

      if (cancelResult instanceof Error) {
        return cancelResult;
      }

      const setStatusResult = await this.massiveProgressRepository.setStatus(
        progress.id,
        jobId,
        MassiveProgressStatusEnum.enum.CANCELED,
      );

      if (setStatusResult instanceof Error) {
        return setStatusResult;
      }
    }

    const setJobStatusResult = await this.massiveJobRepository.setStatus(
      jobId,
      MassiveJobStatusEnum.enum.CANCELED,
    );

    if (setJobStatusResult instanceof Error) {
      return setJobStatusResult;
    }

    return { jobId, status: MassiveJobStatusEnum.enum.CANCELED };
  }
}
