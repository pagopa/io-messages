import {
  Message,
  MessageMetadata,
  messageContentSchema,
} from "@/domain/entities/message.js";
import {
  GetMessageByMetadataReturnType,
  GetMessageContentByIdReturnType,
  MessageContentRepository,
} from "@/domain/interfaces/message-content-repository.js";
import { DefaultAzureCredential } from "@azure/identity";
import {
  BlobServiceClient,
  ContainerClient,
  RestError,
} from "@azure/storage-blob";
import * as assert from "assert";

const defaultAzureCredentials = new DefaultAzureCredential();

//TODO: test this function
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

  //TODO: check if we can split this funciton
  async getMessageByMetadata(
    metadata: MessageMetadata,
  ): Promise<GetMessageByMetadataReturnType> {
    const content = await this.getMessageContentById(metadata.id);
    //TODO: check if we can use a guard here
    if ("subject" in content) {
      return new Message(metadata.id, content, metadata);
    }
    if (content instanceof RestError) {
      return content;
    }
    return content;
  }

  /**
   * Retrieve the content of the message storead as blob.
   *
   * @param messageId {string}
   *
   * @returns {MessageContent} The content of the message.
   * @returns {ContentNotFoundError} There is no blob for this message.
   * @returns {z.ZodError} The content inside the blob does not satisfy the
   * MessageContent shape.
   * @throws {SyntaxError} The content inside the blob is not a valid JSON.
   * @throws {Error} Something happened trying to retrieve the blob.
   **/
  async getMessageContentById(
    messageId: string,
  ): Promise<GetMessageContentByIdReturnType> {
    const blobName = `${messageId}.json`;
    const blobClient = this.#messageContainer.getBlobClient(blobName);

    try {
      const downloadBlockBlobResponse = await blobClient.download();
      assert.ok(downloadBlockBlobResponse.readableStreamBody);

      const downloaded = (
        await getStreamIntoString(downloadBlockBlobResponse.readableStreamBody)
      ).toString();

      const jsonResponse = JSON.parse(downloaded);
      const parsedResponse = messageContentSchema.safeParse(jsonResponse);

      return parsedResponse.success
        ? parsedResponse.data
        : parsedResponse.error;
    } catch (error) {
      if (error instanceof RestError) {
        return error;
      } else {
        throw new Error(`Error retrieving blob with name ${blobName}`, {
          cause: error,
        });
      }
    }
  }
}
