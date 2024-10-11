import {
  MessageContent,
  messageContentSchema,
} from "@/domain/entities/message-content.js";
import { BlobNotFoundError } from "@/domain/interfaces/errors.js";
import { MessageContentRepository } from "@/domain/interfaces/message-content-repository.js";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import * as assert from "assert";
import * as z from "zod";

const defaultAzureCredentials = new DefaultAzureCredential();

// A helper function used to read a Node.js readable stream into a String
async function getStreamIntoString(readableStream: NodeJS.ReadableStream) {
  const chunks = [];

  for await (const chunk of readableStream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf-8");
}

export class BlobMessageContent implements MessageContentRepository {
  #client: BlobServiceClient;
  #messageContainer: ContainerClient;
  constructor(storageUri: string, messageContainerName: string) {
    this.#client = new BlobServiceClient(storageUri, defaultAzureCredentials);
    this.#messageContainer =
      this.#client.getContainerClient(messageContainerName);
  }

  public async getMessageContentById(
    blobName: string,
  ): Promise<MessageContent> {
    const blobClient = this.#messageContainer.getBlobClient(blobName);
    try {
      const downloadBlockBlobResponse = await blobClient.download();
      assert.ok(
        downloadBlockBlobResponse.readableStreamBody,
        new BlobNotFoundError(`No Blob with name ${blobName} found`),
      );
      const downloaded = (
        await getStreamIntoString(downloadBlockBlobResponse.readableStreamBody)
      ).toString();
      console.log("downloaded as string");
      console.log(downloaded);
      const jsonResponse = JSON.parse(downloaded);
      console.log("downloaded as json");
      console.log(jsonResponse);
      const parsedResponse = messageContentSchema.parse(jsonResponse);
      console.log(parsedResponse);
      return parsedResponse;
    } catch (error) {
      if (error instanceof BlobNotFoundError || error instanceof z.ZodError) {
        throw error;
      } else {
        throw new Error(`Error retrieving blob with name ${blobName}`, {
          cause: error,
        });
      }
    }
  }
}
