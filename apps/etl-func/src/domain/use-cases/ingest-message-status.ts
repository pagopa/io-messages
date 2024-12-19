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
    // Transform MessageStatus into MessageStatusEvent
    const messageStatusEventBatch = messageStatusBatch.map(
      getMessageStatusEvent,
    );
    // Load valid MessageStatusEvent batch
    await this.#eventProducer.publish(messageStatusEventBatch);
  }
}
