import { FiscalCode } from "io-messages-common/domain/fiscal-code";
import { pino } from "pino";

import RedisRecipientRepository from "../redis/recipient.js";
import PDVTokenizerClient from "./pdv-tokenizer-client.js";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
});

export class CachedPDVTokenizerClient extends PDVTokenizerClient {
  #recipientRepo: RedisRecipientRepository;

  constructor(
    apiKey: string,
    baseUrl: string,
    recipientRepo: RedisRecipientRepository,
  ) {
    super(apiKey, baseUrl);
    this.#recipientRepo = recipientRepo;
  }

  async maskSensitiveInfo(fiscalCode: FiscalCode): Promise<string> {
    const recipientId = await this.#recipientRepo.get(fiscalCode);
    if (!recipientId) {
      logger.info("Calling tokenizer to mask the fiscal code");
      const token = await super.maskSensitiveInfo(fiscalCode);
      this.#recipientRepo.upsert(fiscalCode, token);
      return token;
    }
    logger.info("RecipientId found in redis cache");
    return recipientId;
  }
}
