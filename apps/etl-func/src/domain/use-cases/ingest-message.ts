import { MessageAdapter } from "@/adapters/message.js";

import { EventProducer } from "../event.js";
import { Message, MessageMetadata } from "../message.js";
import {
  MessageEvent,
  transformMessageToMessageEvent,
} from "../message-event.js";
import { TokenizerClient } from "../tokenizer.js";

export class IngestMessageUseCase {
  #eventProducer: EventProducer<MessageEvent>;
  #messageAdapter: MessageAdapter;
  #tokenizer: TokenizerClient;

  constructor(
    messageAdapter: MessageAdapter,
    tokenizer: TokenizerClient,
    eventProducer: EventProducer<MessageEvent>,
  ) {
    this.#messageAdapter = messageAdapter;
    this.#tokenizer = tokenizer;
    this.#eventProducer = eventProducer;
  }

  async execute(messagesMetaData: MessageMetadata[]) {
    //Retrieving the message contents for each message metadata
    const messages = (
      await Promise.all(
        messagesMetaData.map((messageMetadata) =>
          this.#messageAdapter.getMessageByMetadata(messageMetadata),
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
  }
}
