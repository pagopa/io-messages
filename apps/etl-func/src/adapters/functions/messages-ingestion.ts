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

const processMessageMetadata = (
  input: unknown,
): MessageMetadata | undefined => {
  const { data, success } = messageMetadataSchema.safeParse(input);
  return success && !data?.isPending ? data : undefined;
};

const messagesIngestionHandler =
  (ingestUseCase: IngestMessageUseCase): CosmosDBHandler =>
  async (documents: unknown[]) => {
    //Avoiding all documents different from MessageMetadata schema and with
    //isPending equals to true

    const parsedMessagesMetadata = documents.map(processMessageMetadata);
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

export default messagesIngestionHandler;
