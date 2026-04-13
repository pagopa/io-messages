import { InvocationContext, StorageQueueOutput } from "@azure/functions";

import { CheckJobMessageQueue } from "../check-job-message";
import { ErrorInternal, ErrorNotFound } from "../error";
import {
  MassiveJobID,
  MassiveJobResponse,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
} from "../massive-jobs";
import { TelemetryService } from "../telemetry";

export class StartMassiveNotificationJobUseCase {
  private generateAllTags = (n: number): string[] => {
    const total = 16 ** n;
    const tags = new Array<string>(total);
    for (let i = 0; i < total; i++) {
      tags[i] = i.toString(16).padStart(n, "0");
    }
    return tags;
  };

  constructor(
    private repository: MassiveJobsRepository,
    private checkJobMessageQueue: CheckJobMessageQueue,
    private sendNotificationMessageQueueOutput: StorageQueueOutput,
    private telemetryClient: TelemetryService,
  ) {}

  async execute(
    context: InvocationContext,
    massiveJobId: MassiveJobID,
    startTimeTimestamp: number,
  ): Promise<ErrorInternal | ErrorNotFound | MassiveJobResponse> {
    const massiveJob = await this.repository.getMassiveJob(massiveJobId);

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

    const checkJobMessageResult = await this.checkJobMessageQueue.sendMessage(
      checkNotificationStatusMessage,
    );

    if (checkJobMessageResult instanceof ErrorInternal) {
      return checkJobMessageResult;
    }

    const updatedJob = {
      ...massiveJob,
      startTimeTimestamp,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    };

    const updateResult = await this.repository.updateMassiveJob(updatedJob);

    if (
      updateResult instanceof ErrorInternal ||
      updateResult instanceof ErrorNotFound
    ) {
      return updateResult;
    }

    const allTags = this.generateAllTags(3); // generates 4096 tags from "000" to "fff"
    const batchSize = 10; // we want to process 10 tags for each batch
    // we calculate the delay between batches to ensure that all notifications are sent within the expected execution time of the job
    const delayBetweenBatchesInSeconds =
      (massiveJob.executionTimeInHours * 3600) / (allTags.length / batchSize);

    const sendNotificationMessages = [];
    for (let index = 0; index < allTags.length; index += batchSize) {
      const tags = allTags.slice(index, index + batchSize);

      const scheduledTimestamp = Math.floor(
        (Date.now() +
          (1000 * delayBetweenBatchesInSeconds * (index + batchSize)) /
            batchSize) /
          1000,
      );

      const sendNotificationMessage = {
        jobId: massiveJob.id,
        scheduledTimestamp,
        tags,
      };

      sendNotificationMessages.push(sendNotificationMessage);
    }

    try {
      context.extraOutputs.set(
        this.sendNotificationMessageQueueOutput,
        sendNotificationMessages,
      );
    } catch (error) {
      this.telemetryClient.trackException({
        exception: error instanceof Error ? error : new Error("Unknown error"),
        properties: {
          jobId: massiveJob.id,
        },
      });
    }

    return { id: massiveJob.id, status: MassiveJobStatusEnum.enum.PROCESSING };
  }
}
