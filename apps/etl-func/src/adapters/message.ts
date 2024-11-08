import {
  HasPrecondition,
  Message,
  MessageContent,
  MessageEvent,
  MessageMetadata,
  MessageRepository,
} from "@/domain/message.js";
import { Logger } from "pino";

import { MessageContentError } from "./blob-storage/message-content.js";

export interface MessageContentProvider {
  getByMessageId(messageId: string): Promise<MessageContent>;
}

export class MessageAdapter implements MessageRepository {
  #content: MessageContentProvider;
  #logger: Logger;

  constructor(messageContent: MessageContentProvider, logger: Logger) {
    this.#content = messageContent;
    this.#logger = logger;
  }

  async getMessageByMetadata(
    metadata: MessageMetadata,
  ): Promise<Message | undefined> {
    try {
      const messageContent = await this.#content.getByMessageId(metadata.id);
      return Message.from(metadata.id, messageContent, metadata);
    } catch (error) {
      if (error instanceof MessageContentError) {
        this.#logger.error({
          message: "Error parsing the message content.",
          messageId: metadata.id,
        });
        return;
      }
      throw error;
    }
  }

  #computeHasPrecondition(
    hasPrecondition: HasPrecondition | undefined,
  ): boolean {
    if (!hasPrecondition) return false;
    switch (hasPrecondition) {
      case "ALWAYS":
        return true;
      case "ONCE":
        return true;
      case "NEVER":
        return false;
    }
  }

  transformMessage({
    content,
    metadata,
    contentType,
    id,
  }: Message): MessageEvent {
    if (metadata.isPending === undefined)
      this.#logger.warn(`No isPending found for message with id ${id}`);
    return {
      content_type: contentType,
      feature_level_type: metadata.featureLevelType,
      has_attachments: content.third_party_data?.has_attachments ?? false,
      has_precondition: this.#computeHasPrecondition(
        content.third_party_data?.has_precondition,
      ),
      has_remote_content: content.third_party_data?.has_remote_content ?? false,
      id: id,
      is_pending: metadata.isPending ?? false,
      op: "CREATE",
      payment_data_amount: content.payment_data?.amount ?? null,
      payment_data_invalid_after_due_date:
        content.payment_data?.invalid_after_due_date ?? null,
      payment_data_notice_number: content.payment_data?.notice_number ?? null,
      payment_data_payee_fiscal_code:
        content.payment_data?.payee?.fiscal_code ?? null,
      require_secure_channels: content.require_secure_channels,
      schema_version: 1,
      sender_service_id: metadata.senderServiceId,
      sender_user_id: metadata.senderUserId,
      subject: content.subject,
      timestamp: new Date(metadata.createdAt).getTime(),
    };
  }
}
