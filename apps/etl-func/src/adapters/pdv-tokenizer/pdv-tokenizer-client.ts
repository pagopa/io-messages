import { TokenizerClient } from "@/domain/interfaces/tokenizer.js";
import * as assert from "assert";
import { z } from "zod";

const invalidParamSchema = z.object({
  name: z.string(),
  reason: z.string(),
});

const problemSchema = z.object({
  detail: z.string().optional(),
  instance: z.string().optional(),
  invalidParams: z.array(invalidParamSchema).optional(),
  status: z.number().int(),
  title: z.string(),
  type: z.string().optional(),
});

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

      assert.strictEqual(
        response.ok,
        true,
        new Error(
          `Error in tokenizer api call with status ${response.status}`,
          {
            cause: problemSchema.parse(responseJson),
          },
        ),
      );
      return tokenResourceSchema.parse(responseJson).token;
    } catch (e) {
      throw new Error("Error during tokenizer api call", {
        cause: e,
      });
    }
  }
}
