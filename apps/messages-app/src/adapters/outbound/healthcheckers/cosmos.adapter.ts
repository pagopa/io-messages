import { CosmosClient, RestError } from "@azure/cosmos";
import { GenericError } from "@pagopa/hexagonal-core";
import { getErrorDetail } from "io-messages-common/adapters/error";
import { Result, err, ok } from "neverthrow";

import { AppHealthchecker } from "../../../application/ports/app-healthcheck.js";

export class CosmosClientHealthcheckAdapter implements AppHealthchecker {
  constructor(
    private cosmosClient: CosmosClient,
    private name?: string,
  ) {}

  async health(): Promise<Result<void, GenericError>> {
    try {
      const { statusCode } = await this.cosmosClient
        .database("foo")
        .container("bar")
        .item("healthcheck-test", "healthcheck-test")
        .read();

      if (statusCode === 200 || statusCode === 404) {
        return ok(undefined);
      }

      return err(
        new GenericError(
          `cosmos db ${this.name} unavailable: unexpected status code ${statusCode}`,
        ),
      );
    } catch (e) {
      if (e instanceof RestError) {
        return err(
          new GenericError(
            `cosmos db ${this.name} unavailable: ${e.statusCode} ${e.message}`,
          ),
        );
      }
      return err(
        new GenericError(
          `unexpected error in cosmos db ${this.name}: ${getErrorDetail(e)}`,
        ),
      );
    }
  }
}
