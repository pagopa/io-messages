import { FiscalCode } from "@/domain/message-status.js";

import RedisRecipientRepository from "../redis/recipient.js";
import PDVTokenizerClient from "./pdv-tokenizer-client.js";

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
      const token = await super.maskSensitiveInfo(fiscalCode);
      this.#recipientRepo.upsert(fiscalCode, token);
      return token;
    }
    return recipientId;
  }
}
