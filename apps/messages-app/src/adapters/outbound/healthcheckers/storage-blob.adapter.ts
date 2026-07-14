import { AppHealthchecker } from "@/application/ports/app-healthcheck.js";
import { BlobServiceClient, RestError } from "@azure/storage-blob";
import { GenericError } from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";

export class StorageBlobHealthcheckAdapter implements AppHealthchecker {
  constructor(private blobServiceClient: BlobServiceClient) {}

  async health(): Promise<Result<void, GenericError>> {
    try {
      await this.blobServiceClient.getProperties();
      return ok(undefined);
    } catch (e) {
      if (e instanceof RestError) {
        return err(
          new GenericError(
            `blob storage unavailable: ${e.statusCode} ${e.message}`,
          ),
        );
      }
      return err(new GenericError(`blob storage unavailable: ${e}`));
    }
  }
}
