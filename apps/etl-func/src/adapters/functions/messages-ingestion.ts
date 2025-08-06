import { EventErrorRepository, EventErrorTypesEnum } from "@/domain/event.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
import { CosmosDBHandler, InvocationContext } from "@azure/functions";

import { messageMetadataSchema } from "../../domain/message.js";

const messagesIngestionHandler =
  (
    ingestUseCase: IngestMessageUseCase,
    eventErrorRepository: EventErrorRepository<unknown>,
    telemetryService: TelemetryService,
  ): CosmosDBHandler =>
  async (documents: unknown[], context: InvocationContext) => {
    // filter the array in order to get only valid MessageMetadata with
    // isPending = false
    const nonPendingMessageMetadata = documents
      .filter((document) => {
        const parsedInput = messageMetadataSchema.safeParse(document);
        return parsedInput.success && !parsedInput.data.isPending;
      })
      .map((document) => messageMetadataSchema.parse(document));

    // get all malformed documents so we can send them to the error repository
    const malformedDocuments = documents.filter((document) => {
      const parsedInput = messageMetadataSchema.safeParse(document);
      return !parsedInput.success;
    });

    try {
      await ingestUseCase.execute(nonPendingMessageMetadata);
    } catch (err) {
      if (
        context.retryContext?.retryCount === context.retryContext?.maxRetryCount
      ) {
        telemetryService.trackEvent(
          TelemetryEventName.MESSAGE_EXECUTION_ERROR,
          {
            invocationId: context.invocationId,
          },
        );
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
      try {
        telemetryService.trackEvent(TelemetryEventName.MALFORMED_MESSAGES, {
          invocationId: context.invocationId,
          malformedCount: malformedDocuments.length,
        });
        await Promise.all(
          malformedDocuments.map((malformedDocument) =>
            eventErrorRepository.push(
              malformedDocument,
              EventErrorTypesEnum.enum.MALFORMED_EVENT,
            ),
          ),
        );
      } catch {
        telemetryService.trackEvent(TelemetryEventName.UNEXPECTED_ERROR, {
          invocationId: context.invocationId,
        });
      }
    }
  };

export default messagesIngestionHandler;
