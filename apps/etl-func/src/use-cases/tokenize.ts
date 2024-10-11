import { TokenizerClient, tokenize } from "@/domain/tokenizer.js";

export class TokenizeUseCase {
  #client: TokenizerClient;

  constructor(client: TokenizerClient) {
    this.#client = client;
  }

  async execute(fiscalCode: string): Promise<string> {
    const response = await tokenize(fiscalCode)(this.#client);
    return response.token;
  }
}
