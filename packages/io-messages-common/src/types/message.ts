import { fiscalCodeSchema } from "@/domain/fiscal-code.js";
import { z } from "zod";
import { timestampSchema } from "./date.js";

export const hasPreconditionSchema = z
  .enum(["ALWAYS", "ONCE", "NEVER"])
  .optional();
export type HasPrecondition = z.TypeOf<typeof hasPreconditionSchema>;

export const messageContentSchema = z.object({
  eu_covid_cert: z.object({ auth_code: z.string().optional() }).optional(),
  legal_data: z
    .object({
      has_attachments: z.boolean().default(false),
      message_unique_id: z.string().min(1),
      original_message_url: z.string().min(1).optional(),
      pec_server_service_id: z.string().min(1).optional(),
      sender_mail_from: z.string().min(1),
    })
    .optional(),
  markdown: z.string().min(80).max(10000),
  payment_data: z
    .object({
      amount: z.number().int().min(0).max(9999999999),
      invalid_after_due_date: z.boolean().default(false),
      notice_number: z.string().regex(new RegExp("^[0123][0-9]{17}$")),
      payee: z
        .object({
          fiscal_code: z.string().regex(new RegExp("^[0-9]{11}$")).optional(),
        })
        .optional(),
    })
    .optional(),
  prescription_data: z
    .object({
      iup: z.string().optional(),
      nre: z.string(),
      prescriber_fiscal_code: fiscalCodeSchema.optional(),
    })
    .optional(),
  require_secure_channels: z.boolean().default(false),
  required: z.any().optional(),
  subject: z.string().min(10).max(120),
  third_party_data: z
    .object({
      configuration_id: z.string().ulid().optional(),
      has_attachments: z.boolean().default(false),
      has_precondition: hasPreconditionSchema,
      has_remote_content: z.boolean().default(false),
      id: z.string().min(1),
      original_receipt_date: z.any().optional(),
      original_sender: z.string().min(1).optional(),
      summary: z.string().min(1).optional(),
    })
    .optional(),
  timestamp: timestampSchema.optional(),
});

/**
 * A type that collect all the properties needed for the extract message use-case
 * that can be found inside the message-content blob
 * */
export type MessageContent = z.TypeOf<typeof messageContentSchema>;

export const featureLevelSchema = z
  .enum(["ADVANCED", "STANDARD"])
  .default("STANDARD");

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  featureLevelType: featureLevelSchema,
  fiscalCode: fiscalCodeSchema,
  id: z.string().ulid(),
  indexedId: z.string().ulid(),
  isPending: z.boolean(),
  senderServiceId: z.string().min(1),
  senderUserId: z.string().min(1),
  timeToLiveSeconds: z.number(),
});

export type MessageMetadata = z.TypeOf<typeof messageMetadataSchema>;
