import { MessageStatus } from "@/domain/message-status.js";

import { EventProducer } from "../event.js";
import {
  MessageStatusEvent,
  getMessageStatusEvent,
} from "../message-status-event.js";

export class IngestMessageStatusUseCase {
  #eventProducer: EventProducer<MessageStatusEvent>;

  constructor(eventProducer: EventProducer<MessageStatusEvent>) {
    this.#eventProducer = eventProducer;
  }

  async execute(messageStatusBatch: MessageStatus[]) {
    if (messageStatusBatch.length > 0) {
      // Transform MessageStatus into MessageStatusEvent
      const messageStatusEventBatch = messageStatusBatch
        .filter(
          (messageStatus) =>
            messageStatus.status !== "REJECTED" ||
            messageStatus.rejection_reason !== "USER_NOT_FOUND",
        )
        .map(getMessageStatusEvent);
      // Load valid MessageStatusEvent batch
      await this.#eventProducer.publish(messageStatusEventBatch);
    }
  }
}
