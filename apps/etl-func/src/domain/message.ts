import * as z from "zod";

export const messageAvroSchema = z.object({
  schema_version: z.number(),
  op: z.enum(["CREATE"]),
  id: z.string().ulid(),
  sender_service_id: z.string(),
  sender_user_id: z.string(),
  is_pending: z.boolean(),
  subject: z.string(),
  content_type: z
    .enum(["GENERIC", "PAYMENT", "EU_COVID_CERT", "SEND", "PAGOPA_RECEIPT"])
    .nullable(),
  payment_data_amount: z.number().nullable(),
  payment_data_notice_number: z.string().nullable(),
  payment_data_invalid_after_due_date: z.boolean().nullable(),
  payment_data_payee_fiscal_code: z.string().min(1).nullable(),
  require_secure_channels: z.boolean().default(false),
  timestamp: z.number(),
  feature_level_type: z.enum(["ADVANCED", "STANDARD"]).default("STANDARD"),
  has_remote_content: z.boolean().default(false),
  has_precondition: z.boolean().default(false),
  has_attachments: z.boolean().default(false),
});

export type MessageAvro = z.TypeOf<typeof messageAvroSchema>;
