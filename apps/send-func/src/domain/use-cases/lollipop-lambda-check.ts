import {
  LollipopLambdaClient,
  LollipopLambdaHeaders,
  LollipopLambdaQuery,
  LollipopLambdaRequestBody,
  LollipopLambdaSuccessResponse,
} from "../lollipop-lambda.js";

export class LollipopLambdaCheckUseCase {
  #getLambdaLollipopClient: (isTest: boolean) => LollipopLambdaClient;

  constructor(
    getLambdaLollipopClient: (isTest: boolean) => LollipopLambdaClient,
  ) {
    this.#getLambdaLollipopClient = getLambdaLollipopClient;
  }

  async execute(
    isTest: boolean,
    method: "GET" | "POST",
    headers: LollipopLambdaHeaders,
    query?: LollipopLambdaQuery,
    requestBody?: LollipopLambdaRequestBody,
  ): Promise<LollipopLambdaSuccessResponse> {
    const lambdaLollipopClient = this.#getLambdaLollipopClient(isTest);

    const response =
      method === "GET"
        ? await lambdaLollipopClient.checkWithGet(headers, query)
        : await lambdaLollipopClient.checkWithPost(headers, query, requestBody);

    return response;
  }
}
