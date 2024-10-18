import * as z from "zod";

export type ContentType =
  | "EU_COVID_CERT"
  | "GENERIC"
  | "PAGOPA_RECEIPT"
  | "PAYMENT"
  | "SEND";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  featureLevelType: z.enum(["ADVANCED", "STANDARD"]).default("STANDARD"),
  fiscalCode: z.string().min(1),
  id: z.string().ulid(),
  indexedId: z.string().ulid(),
  isPending: z.boolean().optional(),
  senderServiceId: z.string().min(1),
  senderUserId: z.string().min(1),
  timeToLiveSeconds: z.number(),
});
export type MessageMetadata = z.TypeOf<typeof messageMetadataSchema>;

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
      prescriber_fiscal_code: z
        .string()
        .regex(
          new RegExp(
            "^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$",
          ),
        )
        .optional(),
    })
    .optional(),
  require_secure_channels: z.boolean().default(false),
  required: z.any().optional(),
  subject: z.string().min(10).max(120),
  third_party_data: z
    .object({
      configuration_id: z
        .string()
        .regex(new RegExp("^[0-9A-HJKMNP-TV-Z]{26}$"))
        .describe("ulid")
        .optional(),
      has_attachments: z.boolean().default(false),
      has_precondition: z.enum(["ALWAYS", "ONCE", "NEVER"]).optional(),
      has_remote_content: z.boolean().default(false),
      id: z.string().min(1),
      original_receipt_date: z.any().optional(),
      original_sender: z.string().min(1).optional(),
      summary: z.string().min(1).optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
});

/**
 * A type that collect all the properties needed for the extract message use-case
 * that can be found inside the message-content blob
 * */
export type MessageContent = z.TypeOf<typeof messageContentSchema>;

export class ContentNotFoundError extends Error {
  #kind: "CONTENT_NOT_FOUND";
  #message: string;

  constructor(message: string) {
    super();

    this.#kind = "CONTENT_NOT_FOUND";
    this.#message = message;
  }

  get kind(): "CONTENT_NOT_FOUND" {
    return this.#kind;
  }

  get message(): string {
    return this.#message;
  }
}

export type GetMessageByMetadataReturnType =
  | ContentNotFoundError
  | Message
  | z.ZodError;

export interface MessageRepository {
  getMessageByMetadata: (
    metadata: MessageMetadata,
  ) => Promise<Message | undefined>;
}

export class Message {
  content: MessageContent;
  id: string;
  metadata: MessageMetadata;

  constructor(content: MessageContent, metadata: MessageMetadata) {
    //TODO: geneate this id as an ULID
    this.id = "";
    this.content = content;
    this.metadata = metadata;
  }

  static from(
    id: string,
    content: MessageContent,
    metadata: MessageMetadata,
  ): Message {
    const message = new Message(content, metadata);
    message.id = id;
    return message;
  }

  get contentType(): ContentType {
    if (this.content.eu_covid_cert) return "EU_COVID_CERT";
    // check if the sender of the message is SEND
    if (this.metadata.senderServiceId === "01G40DWQGKY5GRWSNM4303VNRP") {
      return "SEND";
    }
    // check if the sender of the message is PAGOPA_RECEIPT
    if (this.metadata.senderServiceId === "01HD63674XJ1R6XCNHH24PCRR2") {
      return "PAGOPA_RECEIPT";
    }
    if (this.content.payment_data) {
      return "PAYMENT";
    }
    return "GENERIC";
  }
}

export const messageEventSchema = z.object({
  content_type: z
    .enum(["GENERIC", "PAYMENT", "EU_COVID_CERT", "SEND", "PAGOPA_RECEIPT"])
    .default("GENERIC"),
  feature_level_type: z.enum(["ADVANCED", "STANDARD"]).default("STANDARD"),
  has_attachments: z.boolean().default(false),
  has_precondition: z.boolean().default(false),
  has_remote_content: z.boolean().default(false),
  id: z.string().ulid(),
  is_pending: z.boolean(),
  op: z.enum(["CREATE"]),
  payment_data_amount: z.number().nullable(),
  payment_data_invalid_after_due_date: z.boolean().nullable(),
  payment_data_notice_number: z.string().nullable(),
  payment_data_payee_fiscal_code: z.string().min(1).nullable(),
  require_secure_channels: z.boolean().default(false),
  schema_version: z.number(),
  sender_service_id: z.string(),
  sender_user_id: z.string(),
  subject: z.string(),
  timestamp: z.number(),
});

export type MessageEvent = z.TypeOf<typeof messageEventSchema>;
