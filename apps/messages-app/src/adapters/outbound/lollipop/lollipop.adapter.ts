import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { AssertionRef } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import {
  LcParams,
  lcParamsSchema,
} from "io-messages-common/adapters/lollipop/definitions/lc-params";
import { Result, ResultAsync, err, ok } from "neverthrow";

import { MalformedEntityError } from "../../../application/ports/error.js";
import {
  LcParamsError,
  LcParamsRepository,
} from "../../../application/ports/lc-params.js";
import { createClient } from "../../../generated/lollipop/client/index.js";
import { generateLcParams } from "../../../generated/lollipop/sdk.gen.js";
import { ProblemJson } from "../../../generated/lollipop/types.gen.js";

const toGenericError = (error: unknown): GenericError =>
  new GenericError(error instanceof Error ? error.message : String(error));

export class LollipopHttpClientAdapter implements LcParamsRepository {
  constructor(
    private readonly apiKey: string,
    private readonly baseURL: URL,
  ) {}

  async generateLcParams(
    assertionRef: AssertionRef,
    operationId: string,
  ): Promise<Result<LcParams, LcParamsError>> {
    const generateLcParamsResult = await ResultAsync.fromPromise(
      generateLcParams({
        auth: this.apiKey,
        body: { operation_id: operationId },
        client: createClient({ baseUrl: this.baseURL.toString() }),
        path: { assertion_ref: assertionRef },
      }),
      toGenericError,
    );

    if (generateLcParamsResult.isErr())
      return err(generateLcParamsResult.error);

    const response = generateLcParamsResult.value;
    if (!response.response) {
      return err(toGenericError(response.error));
    }

    switch (response.response.status) {
      case 200: {
        if (!response.data) {
          return err(
            new MalformedEntityError("invalid json response from lollipop"),
          );
        }

        const parsedResult = lcParamsSchema.safeParse(response.data);
        if (!parsedResult.success) {
          return err(
            new MalformedEntityError(
              `invalid lc params from lollipop: ${parsedResult.error.message}`,
            ),
          );
        }

        return ok(parsedResult.data);
      }

      case 403:
        return err(new ForbiddenError());

      case 404: {
        const body = response.error as ProblemJson | undefined;
        return err(new NotFoundError("LcParams", body?.detail ?? "Not Found"));
      }

      case 400: {
        const body = response.error as ProblemJson | undefined;
        return err(
          new ValidationError(body?.detail ?? "Unexpected error from Lollipop"),
        );
      }

      default: {
        const body = response.error as ProblemJson | undefined;
        return err(
          new GenericError(body?.detail ?? "Unexpected error from Lollipop"),
        );
      }
    }
  }
}
