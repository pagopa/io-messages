import { EventErrorRepository, EventErrorTypesEnum } from "@/domain/event.js";
import { MessageStatus, messageStatusSchema } from "@/domain/message-status.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { IngestMessageStatusUseCase } from "@/domain/use-cases/ingest-message-status.js";
import { CosmosDBHandler, InvocationContext } from "@azure/functions";
import { ZodError } from "zod";

const messageStatusIngestionHandler =
  (
    ingestUseCase: IngestMessageStatusUseCase,
    eventErrorRepository: EventErrorRepository<unknown>,
    telemetryService: TelemetryService,
  ): CosmosDBHandler =>
  async (documents: unknown[], context: InvocationContext) => {
    const parsedMessageStatusesOrZodError = documents.map((input) => {
      const parsedInput = messageStatusSchema.safeParse(input);
      if (parsedInput.success) return parsedInput.data;
      else return parsedInput.error;
    });

    // filter the array in order to get only valid MessageStatus
    const parsedMessageStatuses = parsedMessageStatusesOrZodError.filter(
      (document): document is MessageStatus => !(document instanceof ZodError),
    );

    // get all malformed documents so we can send them to the error repository
    const malformedDocuments = parsedMessageStatusesOrZodError.filter(
      (document): document is ZodError => document instanceof ZodError,
    );

    try {
      await ingestUseCase.execute(parsedMessageStatuses);
    } catch (err) {
      if (
        context.retryContext?.retryCount === context.retryContext?.maxRetryCount
      ) {
        await Promise.all(
          parsedMessageStatuses.map((parsedMessageStatus) =>
            eventErrorRepository.push(
              parsedMessageStatus,
              EventErrorTypesEnum.enum.INGESTION_PROCESS_ERROR,
            ),
          ),
        );
        telemetryService.trackEvent(
          TelemetryEventName.MESSAGE_STATUS_EXECUTION_ERROR,
          {
            invocationId: context.invocationId,
          },
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
      telemetryService.trackEvent(
        TelemetryEventName.MALFORMED_MESSAGE_STATUSES,
        {
          invocationId: context.invocationId,
        },
      );
    }
  };

export default messageStatusIngestionHandler;
