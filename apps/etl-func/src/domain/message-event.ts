import { z } from "zod";

import { Message } from "./message.js";

type ContentType =
  | "EU_COVID_CERT"
  | "GENERIC"
  | "PAGOPA_RECEIPT"
  | "PAYMENT"
  | "SEND";

export const extractContentType = (message: Message): ContentType => {
  if (message.content.eu_covid_cert) return "EU_COVID_CERT";
  // check if the sender of the message is SEND
  if (message.metadata.senderServiceId === "01G40DWQGKY5GRWSNM4303VNRP") {
    return "SEND";
  }
  // check if the sender of the message is PAGOPA_RECEIPT
  if (message.metadata.senderServiceId === "01HD63674XJ1R6XCNHH24PCRR2") {
    return "PAGOPA_RECEIPT";
  }
  if (message.content.payment_data) {
    return "PAYMENT";
  }
  return "GENERIC";
};

export const messageEventSchema = z.object({
  content_type: z
    .enum(["GENERIC", "PAYMENT", "EU_COVID_CERT", "SEND", "PAGOPA_RECEIPT"])
    .default("GENERIC"),
  feature_level_type: z.enum(["ADVANCED", "STANDARD"]).default("STANDARD"),
  has_attachments: z.boolean().default(false),
  has_precondition: z.boolean().default(false),
  has_remote_content: z.boolean().default(false),
  id: z.string().ulid(),
  op: z.enum(["CREATE"]),
  payment_data_amount: z.number().nullable(),
  payment_data_invalid_after_due_date: z.boolean().nullable(),
  payment_data_notice_number: z.string().nullable(),
  payment_data_payee_fiscal_code: z.string().min(1).nullable(),
  recipient_id: z.string(),
  require_secure_channels: z.boolean().default(false),
  schema_version: z.number().default(1),
  sender_service_id: z.string(),
  sender_user_id: z.string(),
  subject: z.string(),
  timestamp: z.number(),
});

export type MessageEvent = z.TypeOf<typeof messageEventSchema>;
