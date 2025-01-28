import { EventErrorRepository } from "@/domain/event.js";
import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
import { CosmosDBHandler, InvocationContext } from "@azure/functions";

import {
  MessageMetadata,
  messageMetadataSchema,
} from "../../domain/message.js";

const processMessageMetadata = (
  input: unknown,
): MessageMetadata | undefined => {
  const result = messageMetadataSchema.safeParse(input);
  //we are considering, and returning, only processed messages. A processed message has isPending === false
  if (result.success && !result.data.isPending) return result.data;
  else return undefined;
};

const messagesIngestionHandler =
  (
    ingestUseCase: IngestMessageUseCase,
    eventErrorRepository: EventErrorRepository<unknown>,
  ): CosmosDBHandler =>
  async (documents: unknown[], context: InvocationContext) => {
    //Avoid all documents different from MessageMetadata schema and with
    //isPending equals to true

    const parsedMessagesMetadata = documents.map(processMessageMetadata);
    const messagesMetadata: MessageMetadata[] = parsedMessagesMetadata.filter(
      (item): item is MessageMetadata => item !== undefined,
    );

    try {
      throw new Error("new error");
      await ingestUseCase.execute(messagesMetadata);
    } catch (err) {
      if (
        context.retryContext?.retryCount === context.retryContext?.maxRetryCount
      ) {
        await Promise.all(
          documents.map((document) => eventErrorRepository.push(document)),
        );
      }
      throw err;
    }
  };

export default messagesIngestionHandler;
