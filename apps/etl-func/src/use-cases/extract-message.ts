import * as z from "zod";
import { MessageContent } from "@/domain/entities/message-content.js";
import { MessageMetadata } from "@/domain/entities/message-metadata.js";
import { MessageContentRepository } from "@/domain/interfaces/message-content-repository.js";
import { BlobNotFoundError } from "@/domain/interfaces/errors.js";

enum ContentType {
  "GENERIC",
  "PAYMENT",
  "EU_COVID_CERT",
  "SEND",
  "PAGOPA_RECEIPT",
}

export class ExtractMessageUseCase {
  #messageMetadata: MessageMetadata;
  #messageContentRepository: MessageContentRepository;
  #sendServiceId: string;

  constructor(
    messageMetadata: MessageMetadata,
    messageContentRepository: MessageContentRepository,
    sendServiceId: string,
  ) {
    this.#messageMetadata = messageMetadata;
    this.#messageContentRepository = messageContentRepository;
    this.#sendServiceId = sendServiceId;
  }

  public async execute() {
    const blobName = `${this.#messageMetadata.id}.json`;

    try {
      await this.#messageContentRepository.getMessageContentById(blobName);
    } catch (error) {}

    const messageContent =
      await this.#messageContentRepository.getMessageContentById(blobName);
    console.info(messageContent);
    if (messageContent instanceof BlobNotFoundError) {
      return;
    }
    if (messageContent instanceof z.ZodError) {
      messageContent.issues.forEach((issue) => {
        console.error({ issue }, "Error parsing blob property");
      });
      return;
    }
    if (messageContent instanceof Error) {
      throw messageContent;
    }

    const messageContentWithContentType = {
      ...messageContent,
      contentType: this.computeContentType(
        messageContent,
        this.#messageMetadata,
        this.#sendServiceId,
      ),
    };

    console.info(
      `Ending result ${JSON.stringify(messageContentWithContentType)}`,
    );
  }

  private computeContentType = (
    messageContent: MessageContent,
    messageMetadata: MessageMetadata,
    pnServiceId: string,
  ) => {
    if (messageContent.eu_covid_cert) return ContentType.EU_COVID_CERT;
    if (messageContent.third_party_data) {
      return messageMetadata.senderServiceId === pnServiceId
        ? ContentType.SEND
        : ContentType.GENERIC;
    }
    if (messageContent.payment_data) return ContentType.PAYMENT;
    return ContentType.GENERIC;
  };
}
