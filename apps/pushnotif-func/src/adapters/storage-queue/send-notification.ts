import {
  SendNotificationMessage,
  SendNotificationMessageQueue,
} from "../../domain/send-notification";
import { ErrorInternal } from "../../domain/error";
import { QueueClient } from "@azure/storage-queue";

export class SendNotificationQueueAdapter
  implements SendNotificationMessageQueue
{
  constructor(private readonly queueClient: QueueClient) {}

  public async sendMessage(
    sendNotificationMessage: SendNotificationMessage,
  ): Promise<string | ErrorInternal> {
    try {
      const result = await this.queueClient.sendMessage(
        Buffer.from(JSON.stringify(sendNotificationMessage)).toString("base64"),
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
