import {
  LollipopLambdaClient,
  LollipopLambdaHeaders,
  LollipopLambdaQuery,
  LollipopLambdaRequestBody,
  LollipopLambdaSuccessResponse,
} from "../lollipop-lambda.js";

export class LambdaLollipopCheckUseCase {
  #lambdaLollipopClient: () => LollipopLambdaClient;
  #method: "GET" | "POST";

  constructor(
    lambdaLollipopClient: () => LollipopLambdaClient,
    method: "GET" | "POST",
  ) {
    this.#lambdaLollipopClient = lambdaLollipopClient;
    this.#method = method;
  }

  async execute(
    headers: LollipopLambdaHeaders,
    query?: LollipopLambdaQuery,
    requestBody?: LollipopLambdaRequestBody,
  ): Promise<LollipopLambdaSuccessResponse> {
    const lambdaLollipopClient = this.#lambdaLollipopClient();

    const response =
      this.#method === "GET"
        ? await lambdaLollipopClient.checkWithGet(headers, query)
        : await lambdaLollipopClient.checkWithPost(headers, query, requestBody);

    return response;
  }
}
