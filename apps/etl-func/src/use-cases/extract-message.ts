import * as z from "zod";
import { BlobNotFoundError } from "@/domain/message-content/errors.js";
import { MessageContentRepository } from "@/domain/message-content/repository.js";
import { MessageMetadata } from "@/domain/message-metadata/schema.js";
import { messageAvroSchema } from "@/domain/message.js";
import { pino } from "pino";
import { MessageContent } from "@/domain/message-content/schema.js";

enum ContentType {
  "GENERIC",
  "PAYMENT",
  "EU_COVID_CERT",
  "SEND",
  "PAGOPA_RECEIPT",
}

const logger = pino({
  level: "error",
});

//TODO: implement the correct logic of the function
export const computeContentType = (messageContent: MessageContent) => {
  if (messageContent.eu_covid_cert) return ContentType.EU_COVID_CERT;
  if (messageContent.third_party_data) {
    messageContent.
  };
  if (messageContent.payment_data) return ContentType.PAYMENT;
  return ContentType.GENERIC;
};

export const extractMessageUseCase = async (
  messageContentRepository: MessageContentRepository,
  messageMetadata: MessageMetadata,
) => {
  const blobName = `${messageMetadata.id}.json`;
  const messageContent = await messageContentRepository.getBlobByName(blobName);
  if (messageContent instanceof BlobNotFoundError) {
    logger.error(`Error no blob found with name ${blobName}`);
    return;
  }
  if (messageContent instanceof z.ZodError) {
    logger.error(`Error decoding the blob with name ${blobName}`);
    messageContent.issues.forEach((issue) => {
      logger.error({ issue }, "Error parsing blob property");
    });
    return;
  }
  if (messageContent instanceof Error) {
    throw messageContent;
  }

  const messageContentWithContentType = {
    ...messageContent,
    contentType: computeContentType(messageContent),
  };

  const messageToPushInQueue = messageAvroSchema.safeParse({
    ...messageContentWithContentType,
    ...messageMetadata,
  });
  return messageToPushInQueue;
};
