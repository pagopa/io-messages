/**
 * Transform a MessageStatus into a MessageStatusEvent
 **/

import {
  MessageStatus,
  MessageStatusEvent,
  messageStatusEventSchema,
} from "./message-status.js";

export const getMessageStatusEventFromMessageStatus = (
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
