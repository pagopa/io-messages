import { AppHealthchecker } from "@/application/ports/app-healthcheck.js";
import { CosmosClient, RestError } from "@azure/cosmos";
import { GenericError } from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";

export class CosmosClientHealthcheckAdapter implements AppHealthchecker {
  constructor(private cosmosClient: CosmosClient) {}

  async health(): Promise<Result<void, GenericError>> {
    try {
      await this.cosmosClient.databases.readAll().fetchAll();
      return ok(undefined);
    } catch (e) {
      if (e instanceof RestError) {
        return err(
          new GenericError(
            `cosmos db unavailable: ${e.statusCode} ${e.message}`,
          ),
        );
      }
      return err(
        new GenericError(
          `unexpected error: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }
  }
}
