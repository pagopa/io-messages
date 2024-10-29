import { MessageEvent, MessageEventProducer } from "@/domain/message.js";
import avro, { Schema } from "avsc";
import * as fs from "fs";
import { Logger } from "pino";

const messageAvroSchema = JSON.parse(
  fs.readFileSync("./avro/message.avsc", "utf8"),
);

export interface MessageProducerClient {
  publishMessage: (eventMessage: Buffer) => Promise<void>;
}

export class MessageEventAdapter implements MessageEventProducer {
  #logger: Logger;
  #producerClient: MessageProducerClient;

  constructor(producerClient: MessageProducerClient, logger: Logger) {
    this.#producerClient = producerClient;
    this.#logger = logger;
  }

  async publishMessageEvent(message: MessageEvent): Promise<void> {
    try {
      const avroMessageEventType = avro.Type.forSchema(
        messageAvroSchema as Schema,
      );
      const bufferedData = avroMessageEventType.toBuffer(message);
      await this.#producerClient.publishMessage(bufferedData);
    } catch (err) {
      this.#logger.error("Error while sending the event");
      throw err;
    }
  }
}
