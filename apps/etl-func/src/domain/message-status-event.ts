import * as z from "zod";

import {
  MessageStatus,
  messageStatusIdSchema,
  rejectionReasonSchema,
  statusEnum,
} from "./message-status.js";

export const messageStatusEventSchema = z
  .object({
    created_at: z.number(),
    id: messageStatusIdSchema,
    is_archived: z.boolean(),
    is_read: z.boolean(),
    message_id: z.string().ulid(),
    op: z.enum(["CREATE", "UPDATE", "DELETE"]),
    schema_version: z.literal(1),
    status: statusEnum,
    version: z.number().gte(0).int(),
  })
  .and(
    z.discriminatedUnion("status", [
      z.object({
        status: statusEnum.exclude(["REJECTED"]),
      }),
      z.object({
        rejection_reason: rejectionReasonSchema,
        status: statusEnum.extract(["REJECTED"]),
      }),
    ]),
  );
export type MessageStatusEvent = z.TypeOf<typeof messageStatusEventSchema>;

/**
 * Transform a MessageStatus into a MessageStatusEvent
 **/

export const getMessageStatusEvent = (
  messageStatus: MessageStatus,
): MessageStatusEvent =>
  messageStatusEventSchema.parse({
    created_at: new Date(messageStatus.updatedAt).getTime(),
    id: messageStatus.id,
    is_archived: messageStatus.isArchived,
    is_read: messageStatus.isRead,
    message_id: messageStatus.messageId,
    op: messageStatus.version === 0 ? "CREATE" : "UPDATE",
    rejection_reason:
      messageStatus.status === "REJECTED"
        ? messageStatus.rejection_reason
        : undefined,
    schema_version: 1,
    status: messageStatus.status,
    version: messageStatus.version,
  });
