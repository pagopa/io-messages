import {
  MessageStatus,
  MessageStatusEvent,
  messageStatusEventSchema,
} from "@/domain/message-status.js";

/**
 * Transform a MessageStatus into a MessageStatusEvent
 **/

export const getMessageStatusEventFromMessage = (
  messageStatus: MessageStatus,
): MessageStatusEvent =>
  messageStatusEventSchema.parse({
    created_at: messageStatus.updatedAt,
    id: messageStatus.id,
    is_archived: messageStatus.isArchived,
    is_read: messageStatus.isRead,
    message_id: messageStatus.messageId,
    op: messageStatus.version === 0 ? "CREATE" : "UPDATE",
    schema_version: 1,
    status: messageStatus.status,
    timestamp: messageStatus.updatedAt,
    version: messageStatus.version,
  });
