import { QueueClient } from "@azure/storage-queue";
import { GenericError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";

import {
  MessageCreatedEvent,
  MessageCreatedEventPublisher,
} from "../../../application/ports/message-created-event.js";

export class MessageCreatedEventQueueAdapter
  implements MessageCreatedEventPublisher
{
  constructor(private queueClient: QueueClient) {}

  async publish(
    event: MessageCreatedEvent,
  ): Promise<Result<void, GenericError>> {
    const encodedEvent = Buffer.from(
      JSON.stringify({
        ...event,
        // Required by the legacy ProcessMessage decoder but otherwise unused.
        serviceVersion: 0,
      }),
    ).toString("base64");

    const publishResult = await ResultAsync.fromPromise(
      this.queueClient.sendMessage(encodedEvent),
      (error) =>
        new GenericError(
          `error publishing created event for message ${event.messageId}: ${
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error)
          }`,
        ),
    );

    if (publishResult.isErr()) {
      return err(publishResult.error);
    }

    return ok(undefined);
  }
}
