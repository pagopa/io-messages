// Response schemas for the `getMessagesByUser` 200 payload, modelled on the
// OpenAPI `PaginatedPublicMessagesCollection`.
//
// This is the INBOUND ADAPTER (Fastify/HTTP) copy of the schema and it is kept
// intentionally separate from the application port copy in
// `application/ports/messages.ts`, even when the two definitions are identical.
// In the hexagonal architecture each layer owns its own types: the adapter is
// free to evolve its wire contract without leaking HTTP concerns into the
// application core, and vice versa.
import z from "zod";

import { PublicMessage as DomainPublicMessage } from "../../../../application/ports/messages.js";

const MessageStatusAttributesSchema = z.object({
  is_archived: z.boolean().default(false),
  is_read: z.boolean().default(false),
});

const MessageCategoryBaseSchema = z.object({
  tag: z.enum(["EU_COVID_CERT", "GENERIC"]),
});

const MessageCategoryPaymentSchema = z.object({
  rptId: z.string(),
  tag: z.literal("PAYMENT"),
});

const ThirdPartyDataSchema = z.object({
  configuration_id: z.string().optional(),
  has_attachments: z.boolean().default(false),
  has_precondition: z.string().optional(),
  has_remote_content: z.boolean().default(false),
  id: z.string().min(1),
  original_receipt_date: z.string().optional(),
  original_sender: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
});

const MessageCategoryPNSchema = ThirdPartyDataSchema.extend({
  tag: z.literal("PN"),
});

const MessageCategorySchema = z.union([
  MessageCategoryPaymentSchema,
  MessageCategoryBaseSchema,
  MessageCategoryPNSchema,
]);

const EnrichedMessageSchema = MessageStatusAttributesSchema.extend({
  category: MessageCategorySchema.optional(),
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
  time_to_live: z.number().int().min(3600).max(604800).optional(),
});

const CreatedMessageWithoutContentSchema = z.object({
  created_at: z.string(),
  fiscal_code: z.string(),
  id: z.string(),
  sender_service_id: z.string().min(1),
  time_to_live: z.number().int().min(3600).max(604800).optional(),
});

const PublicMessageSchema = z.union([
  EnrichedMessageSchema,
  CreatedMessageWithoutContentSchema,
]);
export type PublicMessage = z.infer<typeof PublicMessageSchema>;

export const PaginatedPublicMessagesCollectionSchema = z.object({
  items: z.array(PublicMessageSchema),
  next: z.string().optional(),
  prev: z.string().optional(),
});

export type PaginatedPublicMessagesCollection = z.infer<
  typeof PaginatedPublicMessagesCollectionSchema
>;

// Maps the application (domain) public message to the wire model exposed by
// this endpoint. The domain EnrichedMessage carries a `status` field that is
// NOT part of the OpenAPI contract (the wire model exposes only the read/archived
// flags via MessageStatusAttributes), so it is dropped here.
export const toPublicMessage = (
  message: DomainPublicMessage,
): PublicMessage => {
  // `message_title` is only present on the enriched variant: we use it to
  // discriminate it from `CreatedMessageWithoutContent`.
  if ("message_title" in message) {
    return {
      category: message.category,
      created_at: message.created_at,
      fiscal_code: message.fiscal_code,
      has_attachments: message.has_attachments,
      has_precondition: message.has_precondition,
      id: message.id,
      is_archived: message.is_archived,
      is_read: message.is_read,
      message_title: message.message_title,
      organization_fiscal_code: message.organization_fiscal_code,
      organization_name: message.organization_name,
      sender_service_id: message.sender_service_id,
      service_name: message.service_name,
      time_to_live: message.time_to_live,
    };
  }

  return {
    created_at: message.created_at,
    fiscal_code: message.fiscal_code,
    id: message.id,
    sender_service_id: message.sender_service_id,
    time_to_live: message.time_to_live,
  };
};
