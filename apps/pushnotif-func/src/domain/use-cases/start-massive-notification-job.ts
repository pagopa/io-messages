import { CheckMassiveJobRepository } from "../check-job-message";
import { ErrorInternal, ErrorNotAccepted, ErrorNotFound } from "../error";
import {
  MassiveJob,
  MassiveJobID,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  StartMassiveJobResult,
} from "../massive-jobs";
import { ProcessMassiveJobRepository } from "../send-notification";
import { TelemetryService } from "../telemetry";

export class MakeStartMassiveNotificationJobUseCase {
  /**
   * This function generates all possible combinations of hexadecimal tags of a given length.
   * If n is 3, it will generate tags from "000" to "fff" (4096 tags).
   * This way we cover all possible tags for the installations, ensuring that the notifications are sent to all of them.
   * The number of generated tags is 16^n.
   */
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
    private processMassiveJobRepository: ProcessMassiveJobRepository,
    private checkMassiveJobRepository: CheckMassiveJobRepository,
    private telemetryClient: TelemetryService,
  ) {}

  private async sendCheckJobMessage(
    massiveJob: MassiveJob,
    startTimeTimestamp: number,
  ): Promise<ErrorInternal | string> {
    // we set the visibility timeout to the expected execution time of the job
    // plus 5 minutes
    const timeToCheckInSeconds = Math.floor(
      startTimeTimestamp +
        5 * 60 +
        massiveJob.executionTimeInHours * 3600 -
        Date.now() / 1000,
    );

    const checkNotificationStatusMessage = {
      jobId: massiveJob.id,
      timeToCheckInSeconds,
    };

    return this.checkMassiveJobRepository.sendMessage(
      checkNotificationStatusMessage,
    );
  }

  private async sendNotificationMessages(
    massiveJob: MassiveJob,
    startTimeTimestamp: number,
  ): Promise<void> {
    const batchSize = 5; // we want to process 5 tags for each batch
    const allTags = this.generateAllTags(3); // generates 4096 tags from "000" to "fff"
    // we calculate the delay between batches to ensure that all notifications are sent
    // within the expected execution time of the job
    // for example, if the job is expected to run for 2 hours and we have 4096 tags
    // with a batch size of 5, we will have 819 batches to process
    // therefore, we need to send a batch approximately every 9 seconds to ensure
    // that all notifications are sent within the 2 hours
    const delayBetweenBatchesInSeconds =
      (massiveJob.executionTimeInHours * 3600) / (allTags.length / batchSize);

    for (let index = 0; index < allTags.length; index += batchSize) {
      const tags = allTags.slice(index, index + batchSize);

      const scheduledTimestamp = Math.floor(
        startTimeTimestamp +
          (delayBetweenBatchesInSeconds * (index + batchSize)) / batchSize,
      );

      const sendNotificationMessage = {
        jobId: massiveJob.id,
        message: massiveJob.message,
        scheduledTimestamp,
        tags,
        title: massiveJob.title,
      };

      const sendMessageResult =
        await this.processMassiveJobRepository.sendMessage(
          sendNotificationMessage,
        );

      if (sendMessageResult instanceof ErrorInternal) {
        this.telemetryClient.trackEvent({
          name: "massiveJob.StartMassiveNotificationJob.scheduleBatch.failed",
          properties: {
            batchSize,
            errorCause: sendMessageResult.cause,
            errorKind: sendMessageResult.constructor.name,
            jobId: massiveJob.id,
            scheduledTimestamp,
            tags,
          },
        });
      }
    }
  }

  async execute(
    massiveJobId: MassiveJobID,
    startTimeTimestamp: number,
  ): Promise<
    ErrorInternal | ErrorNotAccepted | ErrorNotFound | StartMassiveJobResult
  > {
    const getMassiveJobResult =
      await this.massiveJobsRepository.getMassiveJob(massiveJobId);

    if (
      getMassiveJobResult instanceof ErrorInternal ||
      getMassiveJobResult instanceof ErrorNotFound
    ) {
      return getMassiveJobResult;
    }

    if (getMassiveJobResult.status !== "CREATED") {
      return new ErrorNotAccepted(
        `Cannot start massive job with id ${massiveJobId} because it is in ${getMassiveJobResult.status} status`,
      );
    }

    const checkJobMessageResult = await this.sendCheckJobMessage(
      getMassiveJobResult,
      startTimeTimestamp,
    );

    if (checkJobMessageResult instanceof ErrorInternal) {
      return checkJobMessageResult;
    }

    const updatedJob = {
      ...getMassiveJobResult,
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

    await this.sendNotificationMessages(
      getMassiveJobResult,
      startTimeTimestamp,
    );

    return {
      id: getMassiveJobResult.id,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    };
  }
}
