import { TokenizerClient, tokenize } from "@/domain/interfaces/tokenizer.js";

export class TokenizeUseCase {
  #client: TokenizerClient;

  constructor(client: TokenizerClient) {
    this.#client = client;
  }

  async execute(fiscalCode: string): Promise<string> {
    return await tokenize(fiscalCode)(this.#client);
  }
}
