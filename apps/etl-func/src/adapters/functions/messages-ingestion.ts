import { EventErrorRepository } from "@/domain/event.js";
import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
import { CosmosDBHandler, InvocationContext } from "@azure/functions";
import { ZodError } from "zod";

import {
  MessageMetadata,
  messageMetadataSchema,
} from "../../domain/message.js";
import { MessageErrorTypesEnum } from "../table-storage/event-error-table-storage.js";

const messagesIngestionHandler =
  (
    ingestUseCase: IngestMessageUseCase,
    eventErrorRepository: EventErrorRepository<unknown>,
  ): CosmosDBHandler =>
  async (documents: unknown[], context: InvocationContext) => {
    const parsedMessagesMetadataOrZodError = documents.map((input) => {
      const parsedInput = messageMetadataSchema.safeParse(input);
      if (parsedInput.success) return parsedInput.data;
      else return parsedInput.error;
    });

    // filter the array in order to get only valid MessageMetadata with
    // isPending = false
    const nonPendingMessageMetadata = parsedMessagesMetadataOrZodError.filter(
      (document): document is MessageMetadata =>
        !(document instanceof ZodError) && !document.isPending,
    );

    // get all malformed documents so we can send them to the error repository
    const malformedDocuments = parsedMessagesMetadataOrZodError.filter(
      (input): input is ZodError => input instanceof ZodError,
    );

    let success = false;
    try {
      await ingestUseCase.execute(nonPendingMessageMetadata);
      success = true;
    } catch (err) {
      if (
        context.retryContext?.retryCount === context.retryContext?.maxRetryCount
      ) {
        await Promise.all(
          documents.map((document) =>
            eventErrorRepository.push(
              document,
              MessageErrorTypesEnum.enum.INGESTION_PROCESS_ERROR,
            ),
          ),
        );
      }
      throw err;
    }
    if (success && malformedDocuments.length > 0) {
      malformedDocuments.forEach((malformedDocument) =>
        eventErrorRepository.push(
          malformedDocument,
          MessageErrorTypesEnum.enum.MALFORMED_MESSAGE,
        ),
      );
    }
  };

export default messagesIngestionHandler;
