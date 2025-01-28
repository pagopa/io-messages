import { EventErrorRepository } from "@/domain/event.js";
import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
import { CosmosDBHandler, InvocationContext } from "@azure/functions";

import {
  MessageMetadata,
  messageMetadataSchema,
} from "../../domain/message.js";

const messagesIngestionHandler =
  (
    ingestUseCase: IngestMessageUseCase,
    eventErrorRepository: EventErrorRepository<unknown>,
  ): CosmosDBHandler =>
  async (documents: unknown[], context: InvocationContext) => {
    const parsedMessagesMetadata: MessageMetadata[] = [];
    const invalidDocuments: unknown[] = [];

    documents.forEach((document) => {
      const result = messageMetadataSchema.safeParse(document);
      if (!result.success) {
        invalidDocuments.push(document);
        return;
      }
      if (!result.data.isPending) {
        parsedMessagesMetadata.push(result.data);
      }
    });
    let success = false;
    try {
      await ingestUseCase.execute(parsedMessagesMetadata);
      success = true;
    } catch (err) {
      if (
        context.retryContext?.retryCount === context.retryContext?.maxRetryCount
      ) {
        await Promise.all(
          documents.map((document) => eventErrorRepository.push(document, "Error during ingestion")),
        );
      }
      throw err;
    }
    if (success && invalidDocuments.length > 0) {
      invalidDocuments.forEach((invalidDocument) =>
        eventErrorRepository.push(invalidDocument, "Error parsing document as a MessageMetadata"),
      );
    }
  };

export default messagesIngestionHandler;
