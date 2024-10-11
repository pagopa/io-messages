import {
  MessageContent,
  messageContentSchema,
} from "@/domain/entities/message-content.js";
import { ContentNotFoundError } from "@/domain/interfaces/errors.js";
import { MessageContentRepository } from "@/domain/interfaces/message-content-repository.js";
import { DefaultAzureCredential } from "@azure/identity";
import {
  BlobDownloadResponseParsed,
  BlobServiceClient,
  ContainerClient,
} from "@azure/storage-blob";
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

  /**
   * Retrieve the content of the message storead as blob.
   *
   * @param messageId {string}
   *
   * @throws {ContentNotFoundError} There is no blob for this message.
   * @throws {z.ZodError} The content inside the blob does not satisfy the
   * MessageContent shape.
   * @throws {SyntaxError} The content inside the blob is not a valid JSON.
   * @throws {Error} Something happened trying to retrieve the blob.
   * @returns {MessageContent} The content of the message.
   **/
  public async getMessageContentById(
    messageId: string,
  ): Promise<MessageContent> {
    const blobName = `${messageId}.json`;
    const blobClient = this.#messageContainer.getBlobClient(blobName);

    try {
      const downloadBlockBlobResponse = await blobClient.download();

      assert.ok(
        downloadBlockBlobResponse.readableStreamBody,
        new ContentNotFoundError(`No Blob with name ${blobName} found`),
      );

      const downloaded = (
        await getStreamIntoString(downloadBlockBlobResponse.readableStreamBody)
      ).toString();

      const jsonResponse = JSON.parse(downloaded);
      const parsedResponse = messageContentSchema.parse(jsonResponse);

      return parsedResponse;
    } catch (error) {
      if (
        error instanceof ContentNotFoundError ||
        error instanceof z.ZodError
      ) {
        throw error;
      } else {
        throw new Error(`Error retrieving blob with name ${blobName}`, {
          cause: error,
        });
      }
    }
  }
}