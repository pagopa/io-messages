import { EventErrorRepository, EventErrorTypesEnum } from "@/domain/event.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
import { CosmosDBHandler, InvocationContext } from "@azure/functions";
import { ZodError } from "zod";

import {
  MessageMetadata,
  messageMetadataSchema,
} from "../../domain/message.js";

const messagesIngestionHandler =
  (
    ingestUseCase: IngestMessageUseCase,
    eventErrorRepository: EventErrorRepository<unknown>,
    telemetryService: TelemetryService,
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

    try {
      await ingestUseCase.execute(nonPendingMessageMetadata);
    } catch (err) {
      if (
        context.retryContext?.retryCount === context.retryContext?.maxRetryCount
      ) {
        telemetryService.trackEvent(TelemetryEventName.EXECUTION_ERROR, {
          error: err,
          invocationId: context.invocationId,
        });
        await Promise.all(
          documents.map((document) =>
            eventErrorRepository.push(
              document,
              EventErrorTypesEnum.enum.INGESTION_PROCESS_ERROR,
            ),
          ),
        );
      }
      throw err;
    }
    if (malformedDocuments.length > 0) {
      await Promise.all(
        malformedDocuments.map((malformedDocument) =>
          eventErrorRepository.push(
            malformedDocument,
            EventErrorTypesEnum.enum.MALFORMED_EVENT,
          ),
        ),
      );
      telemetryService.trackEvent(TelemetryEventName.MALFORMED_DOCUMENTS, {
        invocationId: context.invocationId,
      });
    }
  };

export default messagesIngestionHandler;
