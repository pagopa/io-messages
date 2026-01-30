import {
  LollipopLambdaClient,
  LollipopLambdaHeaders,
  LollipopLambdaQuery,
  LollipopLambdaRequestBody,
  LollipopLambdaSuccessResponse,
} from "../lollipop-lambda.js";

export class LambdaLollipopCheckUseCase {
  #getLambdaLollipopClient: (isTest: boolean) => LollipopLambdaClient;
  #method: "GET" | "POST";

  constructor(
    getLambdaLollipopClient: (isTest: boolean) => LollipopLambdaClient,
    method: "GET" | "POST",
  ) {
    this.#getLambdaLollipopClient = getLambdaLollipopClient;
    this.#method = method;
  }

  async execute(
    isTest: boolean,
    headers: LollipopLambdaHeaders,
    query?: LollipopLambdaQuery,
    requestBody?: LollipopLambdaRequestBody,
  ): Promise<LollipopLambdaSuccessResponse> {
    const lambdaLollipopClient = this.#getLambdaLollipopClient(isTest);

    const response =
      this.#method === "GET"
        ? await lambdaLollipopClient.checkWithGet(headers, query)
        : await lambdaLollipopClient.checkWithPost(headers, query, requestBody);

    return response;
  }
}
