import { TokenizerClient } from "@/domain/interfaces/tokenizer.js";
import * as assert from "node:assert";

import { piiResourceSchema } from "./pii-resource.js";
import { problemSchema } from "./problem.js";
import { tokenResourceSchema } from "./token-resource.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class PDVTokenizerClient implements TokenizerClient {
  #apiKey: string;
  #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    assert.ok(apiKey, new Error("Api key is required"));
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl;
  }

  async #retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs: 1000,
    retryCondition: (error: unknown) => boolean = () => true,
  ): Promise<T> {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (!retryCondition(error) || attempt >= retries) {
          throw error;
        }
        await delay(delayMs);
      }
    }
    throw new Error(`Error during tokenizer api call after ${retries} retries`);
  }

  async maskSensitiveInfo(pii: string): Promise<string> {
    return this.#retry(
      async () => {
        const request = piiResourceSchema.parse({ pii });
        const response = await fetch(`${this.#baseUrl}/tokens`, {
          body: JSON.stringify(request),
          headers: {
            "content-type": "application/json",
            "x-api-key": this.#apiKey,
          },
          method: "PUT",
        });

        const responseJson = await response.json();

        if (response.ok) {
          return tokenResourceSchema.parse(responseJson).token;
        }
        throw new Error("Error during tokenizer api call", {
          cause: problemSchema.parse(responseJson),
        });
      },
      3,
      1000,
      (error) =>
        error instanceof Error &&
        problemSchema.parse(error.cause).status === 500,
    );
  }
}
