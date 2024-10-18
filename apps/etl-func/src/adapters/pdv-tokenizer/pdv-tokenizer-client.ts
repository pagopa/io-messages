import { TokenizerClient } from "@/domain/interfaces/tokenizer.js";
import * as assert from "node:assert";

import { piiResourceSchema } from "./pii-resource.js";
import { problemSchema } from "./problem.js";
import { tokenResourceSchema } from "./token-resource.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class PDVTokenizerClient implements TokenizerClient {
  #apiKey: string;
  #baseUrl = "https://api.tokenizer.pdv.pagopa.it/tokenizer/v1";

  constructor(apiKey: string) {
    assert.ok(apiKey, new Error("Api key is required"));
    this.#apiKey = apiKey;
  }

  async maskSensitiveInfo(pii: string): Promise<string> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
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

        if (response.status === 500 && attempt < 3) {
          await delay(1000);
          continue;
        }

        if (!response.ok) {
          throw new Error("Error during tokenizer api call", {
            cause: problemSchema.parse(responseJson),
          });
        }

        return tokenResourceSchema.parse(responseJson).token;
      } catch (error) {
        throw new Error("Error during tokenizer api call", {
          cause: error,
        });
      }
    }
    throw new Error("Error during tokenizer api call after 3 retry");
  }
}
