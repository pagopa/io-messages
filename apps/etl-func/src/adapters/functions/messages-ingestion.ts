import { CosmosDBHandler } from "@azure/functions";
import { pino } from "pino";

import {
  Message,
  MessageEvent,
  MessageMetadata,
  messageMetadataSchema,
} from "../../domain/message.js";
import { MessageAdapter, getMessageEventFromMessage } from "../message.js";
import { EventHubEventProducer } from "../message-event.js";
import PDVTokenizerClient from "../pdv-tokenizer/pdv-tokenizer-client.js";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
});

const messagesIngestion =
  (
    messageAdapter: MessageAdapter,
    PDVTokenizer: PDVTokenizerClient,
    producer: EventHubEventProducer<MessageEvent>,
  ): CosmosDBHandler =>
  async (documents: unknown[]) => {
    //Avoiding all documents different from MessageMetadata schema
    const documentsMetadata: MessageMetadata[] = documents.filter(
      (item): item is MessageMetadata =>
        messageMetadataSchema.safeParse(item).success,
    );

    try {
      //Retrieving the message contents for each message metadata
      const messagesContet = (
        await Promise.all(
          documentsMetadata.map((messageMetadata) =>
            messageAdapter.getMessageByMetadata(messageMetadata),
          ),
        )
      ).filter(
        (item: Message | undefined): item is Message => item !== undefined,
      );

      //Transforming messages on message events
      const messagesEvent = await Promise.all(
        messagesContet.map((messageEvent) =>
          getMessageEventFromMessage(messageEvent, PDVTokenizer),
        ),
      );

      await producer.publish(messagesEvent);
    } catch (err) {
      logger.info(`Error during the ingestion process`);
      throw err;
    }
  };

export default messagesIngestion;
