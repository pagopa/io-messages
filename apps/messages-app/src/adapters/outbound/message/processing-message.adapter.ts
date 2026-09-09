import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { GenericError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";

import {
  ProcessingMessagePayload,
  ProcessingMessagePayloadStore,
} from "../../../application/ports/processing-message.js";

export class BlobProcessingMessagePayloadStore
  implements ProcessingMessagePayloadStore
{
  #processingMessageContainer: ContainerClient;

  constructor(blobServiceClient: BlobServiceClient, containerName: string) {
    this.#processingMessageContainer =
      blobServiceClient.getContainerClient(containerName);
  }

  async savePayload(
    payload: ProcessingMessagePayload,
  ): Promise<Result<void, GenericError>> {
    const serializedPayload = JSON.stringify(payload);
    const blobClient = this.#processingMessageContainer.getBlockBlobClient(
      payload.message.id,
    );

    const uploadResult = await ResultAsync.fromPromise(
      blobClient.upload(
        serializedPayload,
        Buffer.byteLength(serializedPayload),
        {},
      ),
      (error) =>
        new GenericError(
          `error storing processing message ${payload.message.id}: ${
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error)
          }`,
        ),
    );

    if (uploadResult.isErr()) {
      return err(uploadResult.error);
    }

    return ok(undefined);
  }
}
