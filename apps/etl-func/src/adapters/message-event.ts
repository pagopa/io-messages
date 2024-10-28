import { MessageEvent } from "@/domain/message.js";
import { MessageEventProducer } from "@/domain/message.js";
import avro, { Schema } from "avsc";
import * as fs from "fs";
import { dirname } from "path";
import * as path from "path";
import { Logger } from "pino";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = path.join(__dirname, "../avro/message.avsc");
const messageAvroSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

export interface EventProducerClient {
  publishEvent: (eventMessage: Buffer) => Promise<void>;
}

export class MessageEventAdapter implements MessageEventProducer {
  #logger: Logger;
  #producerClient: EventProducerClient;

  constructor(producerClient: EventProducerClient, logger: Logger) {
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
