import { QueueClient } from "@azure/storage-queue";

import {
  CheckMassiveJobMessage,
  CheckMassiveJobRepository,
} from "../../domain/check-job-message";
import { ErrorInternal } from "../../domain/error";

export class CheckMassiveJobQueueAdapter implements CheckMassiveJobRepository {
  constructor(private readonly queueClient: QueueClient) {}

  public async sendMessage({
    jobId,
    timeToCheckInSeconds,
  }: CheckMassiveJobMessage): Promise<ErrorInternal | string> {
    try {
      const result = await this.queueClient.sendMessage(
        Buffer.from(JSON.stringify({ jobId: jobId })).toString("base64"),
        {
          visibilityTimeout: timeToCheckInSeconds,
        },
      );
      return result.messageId;
    } catch (err) {
      return new ErrorInternal(
        "Failed to send message to check job queue",
        err instanceof Error ? JSON.stringify(err) : err,
      );
    }
  }
}
