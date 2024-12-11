import {
  Message,
  MessageMetadata,
  MessageRepository,
  messageSchema,
} from "@/domain/message.js";
import {
  MessageEvent,
  extractContentType,
  messageEventSchema,
} from "@/domain/message-event.js";
import { TokenizerClient, maskSensitiveInfo } from "@/domain/tokenizer.js";
import { Logger } from "pino";

import {
  MessageContentError,
  MessageContentProvider,
} from "./blob-storage/message-content.js";

/**
 * Transform a Message into a MessageEvent
 **/
export const transformMessageToMessageEvent = async (
  message: Message,
  tokenizerClient: TokenizerClient,
): Promise<MessageEvent> => {
  const recipient_id = await maskSensitiveInfo(message.metadata.fiscalCode)(
    tokenizerClient,
  );
  return messageEventSchema.parse({
    content_type: extractContentType(message),
    feature_level_type: message.metadata.featureLevelType,
    has_attachments: message.content.third_party_data?.has_attachments,
    has_precondition:
      message.content.third_party_data?.has_precondition === "ALWAYS" ||
      message.content.third_party_data?.has_precondition === "ONCE",
    has_remote_content: message.content.third_party_data?.has_remote_content,
    id: message.id,
    is_pending: message.metadata.isPending,
    op: "CREATE",
    payment_data_amount: message.content.payment_data?.amount ?? null,
    payment_data_invalid_after_due_date:
      message.content.payment_data?.invalid_after_due_date ?? null,
    payment_data_notice_number:
      message.content.payment_data?.notice_number ?? null,
    payment_data_payee_fiscal_code:
      message.content.payment_data?.payee?.fiscal_code ?? null,
    recipient_id,
    require_secure_channels: message.content.require_secure_channels,
    schema_version: 1,
    sender_service_id: message.metadata.senderServiceId,
    sender_user_id: message.metadata.senderUserId,
    subject: message.content.subject,
    timestamp: new Date(message.metadata.createdAt).getTime(),
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
      return messageSchema.parse({
        content: messageContent,
        id: metadata.id,
        metadata,
      });
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
