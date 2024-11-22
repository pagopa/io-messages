import { RecipientIdNotFoundError } from "@/adapters/redis/recipient.js";

import {
  TokenizerEnvironment,
  getCachedRecipientId,
  tokenize,
} from "./interfaces/tokenizer.js";

export class MaskFiscalCodeUseCase {
  #ctx: TokenizerEnvironment;

  constructor(ctx: TokenizerEnvironment) {
    this.#ctx = ctx;
  }

  async execute(fiscalCode: string): Promise<string> {
    try {
      const recipientId = await getCachedRecipientId(fiscalCode)(this.#ctx);
      return recipientId;
    } catch (error) {
      if (error instanceof RecipientIdNotFoundError) {
        return await tokenize(fiscalCode)(this.#ctx);
      }
      throw error;
    }
  }
}
