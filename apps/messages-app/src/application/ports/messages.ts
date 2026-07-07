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

const messageCategorySchema = z.union([
  messageCategoryPaymentSchema,
  messageCategoryBaseSchema,
  messageCategoryPNSchema,
]);
export type MessageCategory = z.TypeOf<typeof messageCategorySchema>;

const enrichedMessageSchema = messageStatusAttributesSchema.extend({
  category: messageCategorySchema.optional(),
  created_at: z.string(),
  fiscal_code: z.string(),
  has_attachments: z.boolean().default(false),
  has_precondition: z.boolean().default(false),
  id: z.string(),
  message_title: z.string(),
  organization_fiscal_code: z.string(),
  organization_name: z.string(),
  sender_service_id: z.string().min(1),
  service_name: z.string(),
  status: messageStatusValueSchema.optional(),
  time_to_live: z.number().int().min(3600).max(604800).optional(),
});

const createdMessageWithoutContentSchema = z.object({
  created_at: z.string(),
  fiscal_code: z.string(),
  id: z.string(),
  sender_service_id: z.string().min(1),
  time_to_live: z.number().int().min(3600).max(604800).optional(),
});

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
