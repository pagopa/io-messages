import { QueueClient } from "@azure/storage-queue";

import { ErrorInternal } from "../../domain/error";
import { CreateOrUpdateInstallationRepository } from "../../domain/installation";
import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { base64EncodeObject } from "../../services/notification";

const installationProcessingDelayInSeconds = 10;

export class CreateOrUpdateInstallationQueueAdapter
  implements CreateOrUpdateInstallationRepository
{
  constructor(private readonly queueClient: QueueClient) {}

  async createOrUpdateInstallation(
    installation: CreateOrUpdateInstallationMessage,
  ): Promise<ErrorInternal | string> {
    try {
      const result = await this.queueClient.sendMessage(
        base64EncodeObject(installation),
        { visibilityTimeout: installationProcessingDelayInSeconds },
      );

      return result.messageId;
    } catch (err) {
      return new ErrorInternal(
        "Failed to enqueue installation update",
        err instanceof Error ? JSON.stringify(err) : err,
      );
    }
  }
}
