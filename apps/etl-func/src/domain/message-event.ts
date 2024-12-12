import { z } from "zod";

import { Message, featureLevelSchema } from "./message.js";
import { TokenizerClient, maskSensitiveInfo } from "./tokenizer.js";

const contentTypeSchema = z
  .enum(["GENERIC", "PAYMENT", "EU_COVID_CERT", "SEND", "PAGOPA_RECEIPT"])
  .default("GENERIC");

export type ContentType = z.TypeOf<typeof contentTypeSchema>;

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
  content_type: contentTypeSchema,
  feature_level_type: featureLevelSchema,
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

/**
 * Transform a Message into a MessageEvent
 **/
export const transformMessageToMessageEvent = async (
  message: Message,
  tokenizerClient: TokenizerClient,
): Promise<MessageEvent> => {
  const recipient_id = await maskSensitiveInfo(message.metadata.fiscalCode)(
    tokenizerClient,
  );
  return messageEventSchema.parse({
    content_type: extractContentType(message),
    feature_level_type: message.metadata.featureLevelType,
    has_attachments: message.content.third_party_data?.has_attachments,
    has_precondition:
      message.content.third_party_data?.has_precondition === "ALWAYS" ||
      message.content.third_party_data?.has_precondition === "ONCE",
    has_remote_content: message.content.third_party_data?.has_remote_content,
    id: message.id,
    is_pending: message.metadata.isPending,
    op: "CREATE",
    payment_data_amount: message.content.payment_data?.amount ?? null,
    payment_data_invalid_after_due_date:
      message.content.payment_data?.invalid_after_due_date ?? null,
    payment_data_notice_number:
      message.content.payment_data?.notice_number ?? null,
    payment_data_payee_fiscal_code:
      message.content.payment_data?.payee?.fiscal_code ?? null,
    recipient_id,
    require_secure_channels: message.content.require_secure_channels,
    schema_version: 1,
    sender_service_id: message.metadata.senderServiceId,
    sender_user_id: message.metadata.senderUserId,
    subject: message.content.subject,
    timestamp: new Date(message.metadata.createdAt).getTime(),
  });
};
