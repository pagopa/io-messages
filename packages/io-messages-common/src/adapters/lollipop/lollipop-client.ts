import { AssertionRef } from "./definitions/assertion-ref.js";
import { generateLcParamsPayloadSchema } from "./definitions/generate-lc-params-payload.js";
import { LcParams, lcParamsSchema } from "./definitions/lc-params.js";

class LollipopClientError extends Error {
  name = "LollipopClientError";
}

export default class LollipopClient {
  #apiKey: string;
  #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl;
  }

  async generateLCParams(
    assertionRef: AssertionRef,
    operationId: string,
  ): Promise<LcParams> {
    try {
      const request = generateLcParamsPayloadSchema.parse({
        operationId: operationId,
      });
      const response = await fetch(
        `${this.#baseUrl}/pubKeys/${assertionRef}/generate`,
        {
          body: JSON.stringify(request),
          headers: {
            "X-Functions-Key": this.#apiKey,
            "content-type": "application/json",
          },
          method: "POST",
        },
      );

      const responseJson = await response.json();

      if (!response.ok) {
        throw new LollipopClientError(
          `Error during generateLcParams with status ${response.status} and body ${JSON.stringify(responseJson)}`,
        );
      }
      return lcParamsSchema.parse(responseJson);
    } catch (e) {
      if (e instanceof LollipopClientError) throw e;
      throw new Error(`Error during generatLcParams api call | ${e}`);
    }
  }
}
