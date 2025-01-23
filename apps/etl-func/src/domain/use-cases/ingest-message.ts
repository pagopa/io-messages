import { pino } from "pino";

import { EventCollector, EventProducer } from "../event.js";
import { Message, MessageMetadata, MessageRepository } from "../message.js";
import {
  MessageEvent,
  transformMessageToMessageEvent,
} from "../message-event.js";
import { TokenizerClient } from "../tokenizer.js";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
});

export class IngestMessageUseCase {
  #eventProducer: EventProducer<MessageEvent>;
  #eventSummaryCollector: EventCollector<MessageEvent>;
  #messageRepo: MessageRepository;
  #tokenizer: TokenizerClient;

  constructor(
    messageAdapter: MessageRepository,
    tokenizer: TokenizerClient,
    eventSummaryCollector: EventCollector<MessageEvent>,
    eventProducer: EventProducer<MessageEvent>,
  ) {
    this.#messageRepo = messageAdapter;
    this.#tokenizer = tokenizer;
    this.#eventSummaryCollector = eventSummaryCollector;
    this.#eventProducer = eventProducer;
  }

  async execute(messagesMetaData: MessageMetadata[]) {
    //Retrieving the message contents for each message metadata
    const messages = (
      await Promise.all(
        messagesMetaData.map((messageMetadata) =>
          this.#messageRepo.getMessageByMetadata(messageMetadata),
        ),
      )
    ).filter((item): item is Message => item !== undefined);

    //Transforming messages on message events
    const messagesEvent = await Promise.all(
      messages.map((message) =>
        transformMessageToMessageEvent(message, this.#tokenizer),
      ),
    );
    if (messagesEvent.length) await this.#eventProducer.publish(messagesEvent);

    try {
      this.#eventSummaryCollector.collect(messagesEvent);
    } catch (error) {
      logger.error(
        `Something went wrong trying to collect message ingestion event summary`,
        error,
      );
    }
  }
}
