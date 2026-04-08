import { CheckJobMessageQueue } from "../check-job-message";
import { ErrorInternal, ErrorNotFound } from "../error";
import {
  MassiveJobStatus,
  MassiveJobsRepository,
  StartMassiveNotificationJobPayload,
} from "../massive-jobs";
import { SendNotificationMessageQueue } from "../send-notification";

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
    private sendNotificationMessageQueue: SendNotificationMessageQueue,
  ) {}

  async execute(
    jobId: StartMassiveNotificationJobPayload,
  ): Promise<ErrorInternal | ErrorNotFound | string> {
    const massiveJob = await this.repository.getMassiveJobById(jobId.id);

    if (massiveJob instanceof ErrorInternal) {
      return massiveJob;
    }
    if (massiveJob instanceof ErrorNotFound) {
      return massiveJob;
    }
    if (massiveJob.status !== "CREATED") {
      return new ErrorInternal(
        `Massive job with id ${jobId.id} is not in CREATED status`,
      );
    }

    const visibilityTimeoutInSeconds =
      massiveJob.startTimeTimestamp +
      massiveJob.executionTimeInHours * 3600 -
      Math.floor(Date.now() / 1000);
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
      status: "PROCESSING" as MassiveJobStatus,
    };

    const updateResult = await this.repository.updateMassiveJob(updatedJob);

    if (updateResult instanceof ErrorInternal) {
      return updateResult;
    }
    if (updateResult instanceof ErrorNotFound) {
      return updateResult;
    }

    const allTags = this.generateAllTags(3); // generates 4096 tags from "000" to "fff"
    const batchSize = 10;
    const delayBetweenBatchesInSeconds =
      (massiveJob.executionTimeInHours * 3600) / (allTags.length / batchSize); // we want to process 10 tags every batch

    for (let index = 0; index < allTags.length; index += batchSize) {
      const tags = allTags.slice(index, index + batchSize);
      const scheduledTimestamp = new Date(
        Date.now() +
          (1000 * delayBetweenBatchesInSeconds * (index + batchSize)) /
            batchSize,
      );
      const sendNotificationMessage = {
        jobId: massiveJob.id,
        scheduledTimestamp: Math.floor(scheduledTimestamp.getTime() / 1000),
        tags,
      };
      const sendNotificationResult =
        await this.sendNotificationMessageQueue.sendMessage(
          sendNotificationMessage,
        );
      if (sendNotificationResult instanceof ErrorInternal) {
        // Log the error into application insights and continue with the next batch
      }
    }

    return massiveJob.id;
  }
}
