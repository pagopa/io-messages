import { TokenizerClient } from "@/domain/interfaces/tokenizer.js";
import { FiscalCode } from "@/domain/message-status.js";
import { z } from "zod";

const tokenResourceSchema = z.object({
  token: z.string().uuid(),
});

export type TokenResourse = z.TypeOf<typeof tokenResourceSchema>;

class PDVApiError extends Error {
  name = "PDVApiError";
}

export default class PDVTokenizerClient implements TokenizerClient {
  #apiKey: string;
  #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl;
  }

  async tokenize(fiscalCode: FiscalCode): Promise<string> {
    try {
      const response = await fetch(`${this.#baseUrl}/tokens`, {
        body: JSON.stringify({ fiscalCode }),
        headers: {
          "content-type": "application/json",
          "x-api-key": this.#apiKey,
        },
        method: "PUT",
      });

      const responseJson = await response.json();

      if (!response.ok) {
        throw new PDVApiError(
          `Error in tokenizer api call with status ${response.status} and body ${responseJson}`,
        );
      }
      return tokenResourceSchema.parse(responseJson).token;
    } catch (e) {
      if (e instanceof PDVApiError) throw e;
      throw new Error(`Error during tokenizer api call | ${e}`);
    }
  }
}
