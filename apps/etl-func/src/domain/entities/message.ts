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
  tymestamp: z.string().optional(),
});

/**
 * A type that collect all the properties needed for the extract message use-case
 * that can be found inside the message-content blob
 * */
export type MessageContent = z.TypeOf<typeof messageContentSchema>;

type ExtractMessageData = { contentType: ContentType } & MessageContent &
  MessageMetadata;

//TODO: check if we can add a stricter error type here
type GetMessageByMetadataReturnType = Error | Message;

export interface MessageRepository {
  getMessageByMetadata: (
    metadata: MessageMetadata,
  ) => Promise<GetMessageByMetadataReturnType>;
}

export class Message {
  #content: MessageContent;
  #id: string;
  #metadata: MessageMetadata;

  constructor(id: string, content: MessageContent, metadata: MessageMetadata) {
    this.#id = id;
    this.#content = content;
    this.#metadata = metadata;
  }

  getDataForExtractMessage(): ExtractMessageData {
    return {
      ...this.#content,
      ...this.#metadata,
      contentType: this.contentType,
    };
  }

  get contentType(): ContentType {
    if (this.#content.eu_covid_cert) return "EU_COVID_CERT";
    if (this.#content.third_party_data) {
      // check if the sender of the message is SEND
      return this.#metadata.senderServiceId === "01G40DWQGKY5GRWSNM4303VNRP"
        ? "SEND"
        : "GENERIC";
    }
    if (this.#content.payment_data) return "PAYMENT";
    return "GENERIC";
  }

  get id(): string {
    return this.#id;
  }
}