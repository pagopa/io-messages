import { TokenizerClient } from "@/domain/tokenizer.js";

import { PiiResource } from "./pii-resource.js";
import { problemSchema } from "./problem.js";
import { TokenResource, tokenResourceSchema } from "./token-resource.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class PDVTokenizerClient implements TokenizerClient {
  #apiKey: string;
  #basePath = "tokenizer/v1";
  #baseUrl = "https://api.tokenizer.pdv.pagopa.it/";

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("Api key is required");
    this.#apiKey = apiKey;
  }

  async tokenize(request: PiiResource): Promise<TokenResource> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(
          `${this.#baseUrl}${this.#basePath}/tokens`,
          {
            body: JSON.stringify(request),
            headers: {
              "content-type": "application/json",
              "x-api-key": this.#apiKey,
            },
            method: "PUT",
          },
        );

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

        return tokenResourceSchema.parse(responseJson);
      } catch (error) {
        throw new Error("Error during tokenizer api call", {
          cause: error,
        });
      }
    }
    throw new Error("Error during tokenizer api call after 3 retry");
  }
}
