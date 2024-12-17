import { MessageStatus, messageStatusSchema } from "@/domain/message-status.js";
import { IngestMessageStatusUseCase } from "@/domain/use-cases/ingest-message-status.js";
import { CosmosDBHandler } from "@azure/functions";

const isValidMessageStatus = (document: unknown): document is MessageStatus =>
  messageStatusSchema.safeParse(document).success;

const messageStatusIngestionHandler =
  (ingestUseCase: IngestMessageStatusUseCase): CosmosDBHandler =>
  async (documents: unknown[]) => {
    const messageStatusBatch = documents.filter(isValidMessageStatus);
    await ingestUseCase.execute(messageStatusBatch);
  };

export default messageStatusIngestionHandler;
