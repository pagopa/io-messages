import {
  Message,
  MessageMetadata,
  MessageRepository,
} from "@/domain/message.js";
import { MessageEvent, messageEventSchema } from "@/domain/message-event.js";
import { TokenizerClient, maskSensitiveInfo } from "@/domain/tokenizer.js";
import { Logger } from "pino";

import {
  MessageContentError,
  MessageContentProvider,
} from "./blob-storage/message-content.js";

/**
 * Transform a Message into a MessageEvent
 **/

export const getMessageEventFromMessage = async (
  { content, contentType, id, metadata }: Message,
  tokenizerClient: TokenizerClient,
): Promise<MessageEvent> => {
  const recipient_id = await maskSensitiveInfo(metadata.fiscalCode)(
    tokenizerClient,
  );
  return messageEventSchema.parse({
    content_type: contentType,
    feature_level_type: metadata.featureLevelType,
    has_attachments: content.third_party_data?.has_attachments,
    has_precondition:
      content.third_party_data?.has_precondition === "ALWAYS" ||
      content.third_party_data?.has_precondition === "ONCE",
    has_remote_content: content.third_party_data?.has_remote_content,
    id: id,
    is_pending: metadata.isPending,
    op: "CREATE",
    payment_data_amount: content.payment_data?.amount ?? null,
    payment_data_invalid_after_due_date:
      content.payment_data?.invalid_after_due_date ?? null,
    payment_data_notice_number: content.payment_data?.notice_number ?? null,
    payment_data_payee_fiscal_code:
      content.payment_data?.payee?.fiscal_code ?? null,
    recipient_id,
    require_secure_channels: content.require_secure_channels,
    schema_version: 1,
    sender_service_id: metadata.senderServiceId,
    sender_user_id: metadata.senderUserId,
    subject: content.subject,
    timestamp: new Date(metadata.createdAt).getTime(),
  });
};

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
      const messageContent = await this.#content.getByMessageContentById(
        metadata.id,
      );
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
}
