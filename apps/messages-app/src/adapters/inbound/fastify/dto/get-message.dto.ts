import z from "zod";

import { messageContentSchema } from "../../../../application/ports/message-content.js";
import {
  MessageOutput,
  messageCategorySchema,
} from "../../../../application/ports/messages.js";

const messageWithContentSchema = z.object({
  content: messageContentSchema,
  created_at: z.string(),
  fiscal_code: z.string(),
  id: z.string(),
  sender_service_id: z.string().min(1),
  time_to_live: z.number().int().min(3600).max(604800).optional(),
});

const enrichedMessageWithContentSchema = messageWithContentSchema.extend({
  category: messageCategorySchema,
  is_archived: z.boolean(),
  is_read: z.boolean(),
  message_title: z.string(),
  organization_fiscal_code: z.string(),
  organization_name: z.string(),
  service_name: z.string(),
});

export const GetMessageResponseSchema = z.object({
  message: z.union([
    enrichedMessageWithContentSchema,
    messageWithContentSchema,
  ]),
});

export type GetMessageResponse = z.infer<typeof GetMessageResponseSchema>;

export const toGetMessageResponse = (
  output: MessageOutput,
): GetMessageResponse => output;
