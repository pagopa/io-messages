import {
  Message,
  MessageContent,
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
  BlobClient,
  BlobServiceClient,
  ContainerClient,
  RestError,
} from "@azure/storage-blob";
import * as assert from "assert";
import * as z from "zod";

const defaultAzureCredentials = new DefaultAzureCredential();

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

  private isMessageContent(input: any): input is MessageContent {
    return "subject" in input && "markdown" in input;
  }

  async getMessageByMetadata(
    metadata: MessageMetadata,
  ): Promise<GetMessageByMetadataReturnType> {
    const content = await this.getMessageContentById(metadata.id);
    if (this.isMessageContent(content)) {
      return new Message(metadata.id, content, metadata);
    }
    if (content instanceof RestError) {
      return content;
    }
    return content;
  }

  private getBlobClientFromMessageId(messageId: string): BlobClient {
    return this.#messageContainer.getBlobClient(`${messageId}.json`);
  }

  private stringToMessageContent(input: string): MessageContent | z.ZodError {
    const jsonResponse = JSON.parse(input);
    const parsed = messageContentSchema.safeParse(jsonResponse);
    return parsed.success ? parsed.data : parsed.error;
  }

  async getMessageContentById(
    messageId: string,
  ): Promise<GetMessageContentByIdReturnType> {
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
