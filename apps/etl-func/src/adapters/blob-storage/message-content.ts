import {
  ContentNotFoundError,
  GetMessageByMetadataReturnType,
  Message,
  MessageContent,
  MessageMetadata,
  messageContentSchema,
} from "@/domain/message.js";
import { DefaultAzureCredential } from "@azure/identity";
import {
  BlobClient,
  BlobServiceClient,
  ContainerClient,
  RestError,
} from "@azure/storage-blob";
import * as assert from "assert";
import * as z from "zod";

const defaultAzureCredentials = new DefaultAzureCredential();

async function getStreamIntoString(
  readableStream: NodeJS.ReadableStream,
): Promise<string> {
  const chunks = [];

  for await (const chunk of readableStream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf-8");
}

export class BlobMessageContent {
  #client: BlobServiceClient;
  #messageContainer: ContainerClient;
  constructor(storageUri: string, messageContainerName: string) {
    this.#client = new BlobServiceClient(storageUri, defaultAzureCredentials);
    this.#messageContainer =
      this.#client.getContainerClient(messageContainerName);
  }

  private getBlobClientFromMessageId(messageId: string): BlobClient {
    return this.#messageContainer.getBlobClient(`${messageId}.json`);
  }

  private isMessageContent(input: object): input is MessageContent {
    return "subject" in input && "markdown" in input;
  }

  private stringToMessageContent(input: string): MessageContent | z.ZodError {
    const jsonResponse = JSON.parse(input);
    const parsed = messageContentSchema.safeParse(jsonResponse);
    return parsed.success ? parsed.data : parsed.error;
  }

  async getMessageByMetadata(
    metadata: MessageMetadata,
  ): Promise<GetMessageByMetadataReturnType> {
    const content = await this.getMessageContentById(metadata.id);
    if (this.isMessageContent(content)) {
      return new Message(metadata.id, content, metadata);
    }
    if (content instanceof RestError) {
      return new ContentNotFoundError(
        `Content not found for message with id ${metadata.id}`,
      );
    }
    return content;
  }

  async getMessageContentById(
    messageId: string,
  ): Promise<MessageContent | RestError | z.ZodError> {
    const blobClient = this.getBlobClientFromMessageId(messageId);

    try {
      const downloadBlockBlobResponse = await blobClient.download();
      assert.ok(downloadBlockBlobResponse.readableStreamBody);

      const downloaded = (
        await getStreamIntoString(downloadBlockBlobResponse.readableStreamBody)
      ).toString();

      return this.stringToMessageContent(downloaded);
    } catch (error) {
      if (error instanceof RestError) {
        return error;
      } else {
        throw new Error(
          `Error retrieving blob for message with id ${messageId}`,
          {
            cause: error,
          },
        );
      }
    }
  }
}
