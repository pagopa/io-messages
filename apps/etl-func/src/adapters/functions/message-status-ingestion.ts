import { MessageStatus, messageStatusSchema } from "@/domain/message-status.js";
import { IngestMessageStatusUseCase } from "@/domain/use-cases/ingest-message-status.js";
import { CosmosDBHandler } from "@azure/functions";

const parseMessageStatus = (input: unknown): MessageStatus | undefined => {
  const { success, data } = messageStatusSchema.safeParse(input);
  return success ? data : undefined;
};

const messageStatusIngestionHandler =
  (ingestUseCase: IngestMessageStatusUseCase): CosmosDBHandler =>
  async (documents: unknown[]) => {
    const parsedMessageStatusBatch = documents.map(parseMessageStatus);
    const messageStatusBatch = parsedMessageStatusBatch.filter(
      (status): status is MessageStatus => status !== undefined,
    );
    // If the batch is empty then simply skip the run
    if (messageStatusBatch.length === 0) return;
    await ingestUseCase.execute(messageStatusBatch);
  };

export default messageStatusIngestionHandler;
