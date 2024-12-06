import { RecipientRepository } from "@/domain/interfaces/tokenizer.js";
import { FiscalCode } from "@/domain/message-status.js";

import PDVTokenizerClient from "./pdv-tokenizer-client.js";

export class CachedPDVTokenizerClient extends PDVTokenizerClient {
  #recipientRepo: RecipientRepository;

  constructor(
    apiKey: string,
    baseUrl: string,
    recipientRepo: RecipientRepository,
  ) {
    super(apiKey, baseUrl);
    this.#recipientRepo = recipientRepo;
  }

  async tokenize(fiscalCode: FiscalCode): Promise<string> {
    const recipientId = await this.#recipientRepo.get(fiscalCode);
    if (!recipientId) {
      const token = await super.tokenize(fiscalCode);
      this.#recipientRepo.upsert(fiscalCode, token);
      return token;
    }
    return recipientId;
  }
}
