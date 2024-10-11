import * as z from "zod";
import { MessageContent } from "@/domain/entities/message-content.js";
import { MessageMetadata } from "@/domain/entities/message-metadata.js";
import { MessageContentRepository } from "@/domain/interfaces/message-content-repository.js";
import { ContentNotFoundError } from "@/domain/interfaces/errors.js";

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

  public async execute(): Promise<
    (MessageMetadata & MessageContent & { contentType: ContentType }) | void
  > {
    const messageContent =
      await this.#messageContentRepository.getMessageContentById(
        this.#messageMetadata.id,
      );

    if (messageContent instanceof ContentNotFoundError) {
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

    const messageContentWithContentTypeAndMetadata = {
      ...messageContent,
      ...this.#messageMetadata,
      contentType: this.computeContentType(
        messageContent,
        this.#messageMetadata,
        this.#sendServiceId,
      ),
    };

    return messageContentWithContentTypeAndMetadata;
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
