import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
import { StorageQueueHandler } from "@azure/functions";
import { pino } from "pino";

import {
  MessageMetadata,
  messageMetadataSchema,
} from "../../domain/message.js";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
});

const processMessageMetadata = (
  input: unknown,
): MessageMetadata | undefined => {
  const result = messageMetadataSchema.safeParse(input);
  //we are considering, and returning, only processed messages. A processed message has isPending === false
  if (result.success && !result.data.isPending) return result.data;
  else return undefined;
};

const messagesIngestionErrorQueueHandler =
  (ingestUseCase: IngestMessageUseCase): StorageQueueHandler =>
  async (queueItem: unknown) => {
    //converting single object to an array to use the same ingestion logic
    //it will always be an 1 item array
    const queueItemArray = [...[], queueItem];
    const parsedMessagesMetadata = queueItemArray.map(processMessageMetadata);
    const messagesMetadata: MessageMetadata[] = parsedMessagesMetadata.filter(
      (item): item is MessageMetadata => item !== undefined,
    );

    try {
      await ingestUseCase.execute(messagesMetadata);
    } catch (err) {
      logger.error(`Error during the ingestion process`);
      throw err;
    }
  };

export default messagesIngestionErrorQueueHandler;
