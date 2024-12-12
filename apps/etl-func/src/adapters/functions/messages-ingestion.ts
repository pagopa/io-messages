import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
import { CosmosDBHandler } from "@azure/functions";
import { pino } from "pino";

import {
  MessageMetadata,
  messageMetadataSchema,
} from "../../domain/message.js";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
});

const messagesIngestionHandler =
  (ingestUseCase: IngestMessageUseCase): CosmosDBHandler =>
  async (documents: unknown[]) => {
    //Avoiding all documents different from MessageMetadata schema and with
    //isPending equals to true
    const messagesMetadata: MessageMetadata[] = documents.filter(
      (item): item is MessageMetadata => {
        const parsedItem = messageMetadataSchema.safeParse(item);
        return parsedItem.success && !parsedItem.data.isPending;
      },
    );

    try {
      await ingestUseCase.execute(messagesMetadata);
    } catch (err) {
      logger.info(`Error during the ingestion process`);
      throw err;
    }
  };

export default messagesIngestionHandler;
