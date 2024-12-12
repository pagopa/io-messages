import { timestampSchema } from "io-messages-common/types/date";
import * as z from "zod";

import {
  MessageStatus,
  messageStatusIdSchema,
  statusEnum,
} from "./message-status.js";

export const messageStatusEventSchema = z.object({
  created_at: z.number(),
  id: messageStatusIdSchema,
  is_archived: z.boolean(),
  is_read: z.boolean(),
  message_id: z.string().ulid(),
  op: z.enum(["CREATE", "UPDATE", "DELETE"]),
  schema_version: z.literal(1),
  status: statusEnum,
  timestamp: timestampSchema,
  version: z.number().gte(0).int(),
});
export type MessageStatusEvent = z.TypeOf<typeof messageStatusEventSchema>;

/**
 * Transform a MessageStatus into a MessageStatusEvent
 **/

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
