import { ProblemJson, problemJsonSchema } from "../../domain/problem-json.js";
import { AssertionRef } from "./definitions/assertion-ref.js";
import { generateLcParamsPayloadSchema } from "./definitions/generate-lc-params-payload.js";
import { LcParams, lcParamsSchema } from "./definitions/lc-params.js";

export class LollipopClientError extends Error {
  body: ProblemJson;
  name: string;

  constructor(message: string, body: ProblemJson) {
    super(message);
    this.name = "LollipopClientError";
    this.body = body;
  }
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
        operation_id: operationId,
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
        const problemJson = problemJsonSchema.parse(responseJson);
        throw new LollipopClientError(
          `Error during generateLcParams with status ${response.status}`,
          problemJson,
        );
      }
      return lcParamsSchema.parse(responseJson);
    } catch (e) {
      if (e instanceof LollipopClientError) throw e;
      throw new Error(`Error during generatLcParams api call | ${e}`);
    }
  }
}
