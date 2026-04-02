import {
  CheckJobMessage,
  CheckJobMessageQueue,
} from "../../domain/check-job-message";
import { ErrorInternal } from "../../domain/error";
import { QueueClient } from "@azure/storage-queue";

export class CheckJobMessageQueueAdapter implements CheckJobMessageQueue {
  constructor(private readonly queueClient: QueueClient) {}

  public async sendMessage({
    jobId,
    visibilityTimeoutInSeconds,
  }: CheckJobMessage): Promise<string | ErrorInternal> {
    try {
      const result = await this.queueClient.sendMessage(
        Buffer.from(JSON.stringify({ jobId: jobId })).toString("base64"),
        {
          visibilityTimeout: visibilityTimeoutInSeconds,
        },
      );
      return result.messageId;
    } catch (err) {
      return new ErrorInternal(
        "Failed to send message to check job queue",
        err,
      );
    }
  }
}
