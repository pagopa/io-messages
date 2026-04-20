import { QueueClient } from "@azure/storage-queue";

import { ErrorInternal } from "../../domain/error";
import {
  ProcessMassiveJobMessage,
  ProcessMassiveJobRepository,
} from "../../domain/send-notification";

export class ProcessMassiveJobQueueAdapter
  implements ProcessMassiveJobRepository
{
  constructor(private readonly queueClient: QueueClient) {}

  public async sendMessage(
    message: ProcessMassiveJobMessage,
  ): Promise<ErrorInternal | string> {
    try {
      const result = await this.queueClient.sendMessage(
        Buffer.from(JSON.stringify(message)).toString("base64"),
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
