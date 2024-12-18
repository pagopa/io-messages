import { MessageStatus, messageStatusSchema } from "@/domain/message-status.js";
import { IngestMessageStatusUseCase } from "@/domain/use-cases/ingest-message-status.js";
import { CosmosDBHandler } from "@azure/functions";

const isValidMessageStatus = (document: unknown): document is MessageStatus =>
  messageStatusSchema.safeParse(document).success;

const messageStatusIngestionHandler =
  (ingestUseCase: IngestMessageStatusUseCase): CosmosDBHandler =>
  async (documents: unknown[]) => {
    const messageStatusBatch = documents.filter(isValidMessageStatus);
    // If the batch is empty then simply skip the run
    if (messageStatusBatch.length === 0) return;
    await ingestUseCase.execute(messageStatusBatch);
  };

export default messageStatusIngestionHandler;
