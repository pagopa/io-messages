import avro, { Schema } from "avsc";
import { Logger } from "pino";
import { z } from "zod";

import messageAvroSchema from "../../avro/message.avsc";

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

//va su domain messages
export interface MessageEventProducer {
  publishMessageEvent: (message: MessageEvent) => Promise<void>;
}

//spostare su adatapter
export interface MessageEventProducerClient {
  publishEvent: (eventMessage: Buffer) => Promise<void>;
}

//va su adapter perchè è strettamente legato all'implementazione dell'eventhub e avro
export class MessageEventAdapter implements MessageEventProducer {
  #logger: Logger;
  #producerClient: MessageEventProducerClient;

  constructor(producerClient: MessageEventProducerClient, logger: Logger) {
    this.#producerClient = producerClient;
    this.#logger = logger;
  }

  async publishMessageEvent(eventMessage: MessageEvent): Promise<void> {
    try {
      const avroMessageEventType = avro.Type.forSchema(
        messageAvroSchema as Schema,
      );
      const bufferedData = avroMessageEventType.toBuffer(eventMessage);
      await this.#producerClient.publishEvent(bufferedData);
    } catch (err) {
      this.#logger.error("Error while sending the event");
      throw err;
    }
  }
}
