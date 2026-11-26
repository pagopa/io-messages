import type { HttpHandler } from "@azure/functions";

import type { GetInfoUseCase } from "../../../application/use-cases/info.use-case.js";

const errorMessage = "Could not read function info";

export const makeInfoHandler =
  (getInfo: GetInfoUseCase): HttpHandler =>
  async (_request, context) => {
    const result = await getInfo({});

    if (result.isErr()) {
      context.error(errorMessage, result.error.message);
      return { jsonBody: { error: errorMessage }, status: 500 };
    }

    return { jsonBody: result.value, status: 200 };
  };
