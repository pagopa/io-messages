import { CosmosDBHandler } from "@azure/functions";
import { pino } from "pino";

import {
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
    try {
      const documentsMetadata: MessageMetadata[] = documents
        .map((document) => {
          const messageMetadata = messageMetadataSchema.safeParse(document);
          if (messageMetadata.success) {
            return messageMetadata.data;
          }
          return undefined;
        })
        .filter((item) => item !== undefined);

      const messagesContetPromiseArray = documentsMetadata.map(
        (messageMetadata) =>
          messageAdapter.getMessageByMetadata(messageMetadata),
      );
      const messagesContet = (
        await Promise.all(messagesContetPromiseArray)
      ).filter((item) => item !== undefined);
      const messagesEventPromiseArray = messagesContet.map((messageEvent) =>
        getMessageEventFromMessage(messageEvent, PDVTokenizer),
      );
      const messagesEvent = await Promise.all(messagesEventPromiseArray);

      await producer.publish(messagesEvent);
    } catch (err) {
      logger.info(`Error during the ingestion process`);
      throw err;
    }
  };

export default messagesIngestion;
