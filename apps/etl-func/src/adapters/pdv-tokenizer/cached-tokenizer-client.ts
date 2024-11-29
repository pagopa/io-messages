import { RecipientRepository } from "@/domain/interfaces/tokenizer.js";

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

  async tokenize(pii: string): Promise<string> {
    const recipientId = await this.#recipientRepo.get(pii);
    if (!recipientId) {
      const token = await super.tokenize(pii);
      this.#recipientRepo.upsert(pii, token);
      return token;
    }
    return recipientId;
  }
}
