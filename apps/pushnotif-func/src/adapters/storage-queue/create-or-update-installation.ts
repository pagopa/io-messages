import { QueueClient } from "@azure/storage-queue";
import { GenericError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync } from "neverthrow";

import {
  CreateOrUpdateInstallationMessage,
  CreateOrUpdateInstallationRepository,
} from "../../domain/installation";
import { base64EncodeObject } from "../../services/notification";

const installationProcessingDelayInSeconds = 10;

export class CreateOrUpdateInstallationQueueAdapter
  implements CreateOrUpdateInstallationRepository
{
  constructor(private readonly queueClient: QueueClient) {}

  /**
   * Enqueues the installation update with the ten-second visibility delay used
   * by io-backend to preserve notification ordering in the legacy workflow.
   */
  async createOrUpdateInstallation(
    installation: CreateOrUpdateInstallationMessage,
  ): Promise<Result<string, GenericError>> {
    return ResultAsync.fromPromise(
      this.queueClient.sendMessage(base64EncodeObject(installation), {
        visibilityTimeout: installationProcessingDelayInSeconds,
      }),
      () => new GenericError("Failed to enqueue installation update"),
    ).map(({ messageId }) => messageId);
  }
}
