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
    const parsedMetadata = processMessageMetadata(queueItem);
    if (parsedMetadata === undefined) return;

    try {
      await ingestUseCase.execute([parsedMetadata]);
    } catch (err) {
      logger.error(`Error during the ingestion process`);
      throw err;
    }
  };

export default messagesIngestionErrorQueueHandler;
