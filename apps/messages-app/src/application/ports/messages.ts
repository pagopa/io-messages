// Response schemas for the `getMessagesByUser` operation, modelled on the
// OpenAPI `PaginatedPublicMessagesCollection`.
//
// This is the APPLICATION PORT copy of the schema: it defines the type the use
// case produces, independently of any transport. It is kept intentionally
// separate from the inbound adapter copy in
// `adapters/inbound/fastify/dto/get-messages.dto.ts`, even when the two
// definitions are identical. In the hexagonal architecture each layer owns its
// own types, so the application core does not depend on the HTTP/Fastify layer.
import z from "zod";

import { messageContentSchema } from "./message-content.js";
import { messageStatusValueSchema } from "./message-status.js";

const messageStatusAttributesSchema = z.object({
  is_archived: z.boolean().default(false),
  is_read: z.boolean().default(false),
});

const messageCategoryBaseSchema = z.object({
  tag: z.enum(["EU_COVID_CERT", "GENERIC"]),
});

const messageCategoryPaymentSchema = z.object({
  rptId: z.string(),
  tag: z.literal("PAYMENT"),
});

const thirdPartyDataSchema = z.object({
  configuration_id: z.string().optional(),
  has_attachments: z.boolean().default(false),
  has_precondition: z.string().optional(),
  has_remote_content: z.boolean().default(false),
  id: z.string().min(1),
  original_receipt_date: z.string().optional(),
  original_sender: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
});

const messageCategoryPNSchema = thirdPartyDataSchema.extend({
  tag: z.literal("PN"),
});

export const messageCategorySchema = z.union([
  messageCategoryPaymentSchema,
  messageCategoryBaseSchema,
  messageCategoryPNSchema,
]);
export type MessageCategory = z.TypeOf<typeof messageCategorySchema>;

const messageBaseSchema = z.object({
  created_at: z.string(),
  fiscal_code: z.string(),
  id: z.string(),
  sender_service_id: z.string().min(1),
  time_to_live: z.number().int().min(3600).max(604800).optional(),
});

const enrichedMessageBaseSchema = messageBaseSchema.extend({
  message_title: z.string(),
  organization_fiscal_code: z.string(),
  organization_name: z.string(),
  service_name: z.string(),
});

export const messageWithContentSchema = messageBaseSchema.extend({
  content: messageContentSchema,
});
export type MessageWithContent = z.TypeOf<typeof messageWithContentSchema>;

export const enrichedMessageWithContentSchema =
  enrichedMessageBaseSchema.extend({
    category: messageCategorySchema,
    content: messageContentSchema,
    is_archived: z.boolean(),
    is_read: z.boolean(),
  });
export type EnrichedMessageWithContent = z.TypeOf<
  typeof enrichedMessageWithContentSchema
>;

export const messageSchema = z.object({
  message: z.union([
    enrichedMessageWithContentSchema,
    messageWithContentSchema,
  ]),
});
export type MessageOutput = z.TypeOf<typeof messageSchema>;

const enrichedMessageSchema = enrichedMessageBaseSchema.extend({
  ...messageStatusAttributesSchema.shape,
  category: messageCategorySchema.optional(),
  has_attachments: z.boolean().default(false),
  has_precondition: z.boolean().default(false),
  status: messageStatusValueSchema.optional(),
});

const createdMessageWithoutContentSchema = messageBaseSchema;

const publicMessageSchema = z.union([
  enrichedMessageSchema,
  createdMessageWithoutContentSchema,
]);
export type PublicMessage = z.TypeOf<typeof publicMessageSchema>;

export const paginatedPublicMessagesCollectionSchema = z.object({
  items: z.array(publicMessageSchema),
  next: z.string().optional(),
  prev: z.string().optional(),
});
export type PaginatedPublicMessagesCollection = z.TypeOf<
  typeof paginatedPublicMessagesCollectionSchema
>;
