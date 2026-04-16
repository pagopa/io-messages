import { CheckJobMessageRepository } from "../check-job-message";
import { ErrorInternal, ErrorNotFound } from "../error";
import {
  MassiveJob,
  MassiveJobID,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  StartMassiveJobResponse,
} from "../massive-jobs";
import { SendNotificationMessageRepository } from "../send-notification";
import { TelemetryService } from "../telemetry";

export class MakeStartMassiveNotificationJobUseCase {
  private generateAllTags = (n: number): string[] => {
    const total = 16 ** n;
    const tags = new Array<string>(total);
    for (let i = 0; i < total; i++) {
      tags[i] = i.toString(16).padStart(n, "0");
    }
    return tags;
  };

  constructor(
    private massiveJobsRepository: MassiveJobsRepository,
    private sendNotificationMessageRepository: SendNotificationMessageRepository,
    private checkJobMessageRepository: CheckJobMessageRepository,
    private telemetryClient: TelemetryService,
  ) {}

  private async sendCheckJobMessage(
    massiveJob: MassiveJob,
    startTimeTimestamp: number,
  ): Promise<ErrorInternal | string> {
    // we set the visibility timeout to the expected execution time of the job plus 5 minutes
    const visibilityTimeoutInSeconds = Math.floor(
      startTimeTimestamp +
        5 * 60 +
        massiveJob.executionTimeInHours * 3600 -
        Date.now() / 1000,
    );

    const checkNotificationStatusMessage = {
      jobId: massiveJob.id,
      visibilityTimeoutInSeconds: visibilityTimeoutInSeconds,
    };

    return this.checkJobMessageRepository.sendMessage(
      checkNotificationStatusMessage,
    );
  }

  private async sendNotificationMessages(
    massiveJob: MassiveJob,
  ): Promise<void> {
    const batchSize = 10; // we want to process 10 tags for each batch
    const allTags = this.generateAllTags(3); // generates 4096 tags from "000" to "fff"
    // we calculate the delay between batches to ensure that all notifications are sent within the expected execution time of the job
    const delayBetweenBatchesInSeconds =
      (massiveJob.executionTimeInHours * 3600) / (allTags.length / batchSize);

    for (let index = 0; index < allTags.length; index += batchSize) {
      const tags = allTags.slice(index, index + batchSize);

      const scheduledTimestamp = Math.floor(
        (Date.now() +
          (1000 * delayBetweenBatchesInSeconds * (index + batchSize)) /
            batchSize) /
          1000,
      );

      const sendNotificationMessage = {
        body: massiveJob.body,
        jobId: massiveJob.id,
        scheduledTimestamp,
        tags,
        title: massiveJob.title,
      };

      const sendMessageResult =
        await this.sendNotificationMessageRepository.sendMessage(
          sendNotificationMessage,
        );

      if (sendMessageResult instanceof ErrorInternal) {
        this.telemetryClient.trackEvent({
          name: "massiveJobs.FailedToScheduleNotificationBatches",
          properties: {
            error: sendMessageResult.message,
            jobId: massiveJob.id,
            scheduledTimestamp: scheduledTimestamp.toString(),
            tags: tags.join(","),
          },
        });
      }
    }
  }

  async execute(
    massiveJobId: MassiveJobID,
    startTimeTimestamp: number,
  ): Promise<ErrorInternal | ErrorNotFound | StartMassiveJobResponse> {
    const massiveJob =
      await this.massiveJobsRepository.getMassiveJob(massiveJobId);

    if (
      massiveJob instanceof ErrorInternal ||
      massiveJob instanceof ErrorNotFound
    ) {
      return massiveJob;
    }

    if (massiveJob.status !== "CREATED") {
      return new ErrorInternal(
        `Cannot start massive job with id ${massiveJobId} because it is not in CREATED status`,
      );
    }

    const checkJobMessageResult = await this.sendCheckJobMessage(
      massiveJob,
      startTimeTimestamp,
    );

    if (checkJobMessageResult instanceof ErrorInternal) {
      return checkJobMessageResult;
    }

    const updatedJob = {
      ...massiveJob,
      startTimeTimestamp,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    };

    const updateResult =
      await this.massiveJobsRepository.updateMassiveJob(updatedJob);

    if (
      updateResult instanceof ErrorInternal ||
      updateResult instanceof ErrorNotFound
    ) {
      return updateResult;
    }

    await this.sendNotificationMessages(massiveJob);

    return {
      id: massiveJob.id,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    };
  }
}
