import { TokenizerClient } from "@/domain/interfaces/tokenizer.js";
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

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
});

const messagesIngestion =
  (
    messageAdapter: MessageAdapter,
    tokenizer: TokenizerClient,
    producer: EventHubEventProducer<MessageEvent>,
  ): CosmosDBHandler =>
  async (documents: unknown[]) => {
    //Avoiding all documents different from MessageMetadata schema and with
    //isPending equals to true
    const documentsMetadata: MessageMetadata[] = documents.filter(
      (item): item is MessageMetadata => {
        const parsedItem = messageMetadataSchema.safeParse(item);
        return parsedItem.success && !parsedItem.data.isPending;
      },
    );

    try {
      //Retrieving the message contents for each message metadata
      const messagesContent = (
        await Promise.all(
          documentsMetadata.map((messageMetadata) =>
            messageAdapter.getMessageByMetadata(messageMetadata),
          ),
        )
      ).filter((item): item is Message => item !== undefined);

      //Transforming messages on message events
      const messagesEvent = await Promise.all(
        messagesContent.map((messageEvent) =>
          getMessageEventFromMessage(messageEvent, tokenizer),
        ),
      );
      if (messagesEvent.length) await producer.publish(messagesEvent);
      return;
    } catch (err) {
      logger.info(`Error during the ingestion process`);
      throw err;
    }
  };

export default messagesIngestion;
