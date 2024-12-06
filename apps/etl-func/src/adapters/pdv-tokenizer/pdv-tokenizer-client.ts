import { TokenizerClient } from "@/domain/interfaces/tokenizer.js";
import { z } from "zod";

const tokenResourceSchema = z.object({
  token: z.string().uuid(),
});

export default class PDVTokenizerClient implements TokenizerClient {
  #apiKey: string;
  #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl;
  }

  async tokenize(pii: string): Promise<string> {
    try {
      const response = await fetch(`${this.#baseUrl}/tokens`, {
        body: JSON.stringify({ pii }),
        headers: {
          "content-type": "application/json",
          "x-api-key": this.#apiKey,
        },
        method: "PUT",
      });

      const responseJson = await response.json();

      if (!response.ok)
        throw new Error(
          `Error in tokenizer api call with status ${response.status} and body ${responseJson}`,
        );
      return tokenResourceSchema.parse(responseJson).token;
    } catch (e) {
      throw new Error(`Error during tokenization | ${e}`, {
        cause: e,
      });
    }
  }
}
