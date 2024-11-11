import { TokenizerClient } from "@/domain/interfaces/tokenizer.js";
import * as assert from "assert";

import { piiResourceSchema } from "./pii-resource.js";
import { problemSchema } from "./problem.js";
import { tokenResourceSchema } from "./token-resource.js";

export default class PDVTokenizerClient implements TokenizerClient {
  #apiKey: string;
  #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl;
  }

  async tokenize(pii: string): Promise<string> {
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

    assert.strictEqual(
      response.ok,
      false,
      new Error("Error during tokenizer api call", {
        cause: problemSchema.parse(responseJson),
      }),
    );
    return tokenResourceSchema.parse(responseJson).token;
  }
}
