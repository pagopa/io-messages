import { MalformedEntityError } from "@/application/ports/error.js";
import {
  BlobServiceClient,
  ContainerClient,
  RestError,
} from "@azure/storage-blob";
import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, fromThrowable, ok } from "neverthrow";
import z from "zod";

import {
  MessageContent,
  MessageContentRepository,
} from "../../../application/ports/message-content.js";

// The message content as it is persisted on the blob storage. This is the
// adapter specific representation and it is intentionally kept separate from
// the domain `MessageContent` type: the adapter validates the raw blob and then
// maps it to the domain type required by the port.
const cosmosHasPreconditionSchema = z
  .enum(["ALWAYS", "ONCE", "NEVER"])
  .optional();

const blobMessageContentSchema = z.object({
  eu_covid_cert: z.object({ auth_code: z.string().optional() }).optional(),
  markdown: z.string().min(80).max(10000),
  payment_data: z
    .object({
      amount: z.number().int().min(0).max(9999999999),
      invalid_after_due_date: z.boolean().default(false),
      notice_number: z.string().regex(new RegExp("^[0123][0-9]{17}$")),
      payee: z
        .object({
          fiscal_code: z.string().regex(new RegExp("^[0-9]{11}$")).optional(),
        })
        .optional(),
    })
    .optional(),
  require_secure_channels: z.boolean().default(false),
  subject: z.string().min(10).max(120),
  third_party_data: z
    .object({
      configuration_id: z.ulid().optional(),
      has_attachments: z.boolean().default(false),
      has_precondition: cosmosHasPreconditionSchema,
      has_remote_content: z.boolean().default(false),
      id: z.string().min(1),
      original_receipt_date: z.string().optional(),
      original_sender: z.string().min(1).optional(),
      summary: z.string().min(1).optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
});
type BlobMessageContent = z.TypeOf<typeof blobMessageContentSchema>;

// Maps the adapter specific blob representation to the domain type expected by
// the port. The blob is already stored in snake_case, exactly as the domain
// type, so this is a straight mapping.
const toMessageContent = (c: BlobMessageContent): MessageContent => c;

export class MessageContentBlobAdapter implements MessageContentRepository {
  #messageContainer: ContainerClient;

  constructor(blobServiceClient: BlobServiceClient, containerName: string) {
    this.#messageContainer =
      blobServiceClient.getContainerClient(containerName);
  }

  // getContentById returns the content of the message identified by
  // `messageID`.
  async #getContentById(
    messageID: string,
  ): Promise<
    Result<
      MessageContent,
      GenericError | MalformedEntityError | NotFoundError | TooManyRequestsError
    >
  > {
    const blobClient = this.#messageContainer.getBlobClient(
      `${messageID}.json`,
    );

    const downloadResult = await ResultAsync.fromPromise(
      blobClient.downloadToBuffer(),
      (err) => {
        if (err instanceof RestError) {
          switch (err.statusCode) {
            case 429:
              return new TooManyRequestsError();
            case 404:
              return new NotFoundError(
                "message content",
                `cannot find message content for message identified by messageID: ${messageID}`,
              );
            default:
              return new GenericError(
                `error while retrieving message content for message ${messageID}: ${err.name}: ${err.message}`,
              );
          }
        }
        return new GenericError(
          `error while retrieving message content for message ${messageID}`,
        );
      },
    );

    if (downloadResult.isErr()) {
      return err(downloadResult.error);
    }

    const parsedContent = this.#parseContent(downloadResult.value);
    if (parsedContent.isErr()) {
      // In this case we know that the message content is malformed
      // TODO: Add a log.
      return err(
        new MalformedEntityError(
          `invalid message content for message with id: ${messageID}" ${parsedContent.error.name}: ${parsedContent.error.message}`,
        ),
      );
    }

    return ok(parsedContent.value);
  }

  // parseContent perform runtime validation over the buffer.
  // errors short-circuit and fail the whole operation.
  #parseContent(buffer: Buffer): Result<MessageContent, GenericError> {
    const parsedMessageContent = fromThrowable(
      () => blobMessageContentSchema.parse(JSON.parse(buffer.toString())),
      () =>
        new GenericError(`Invalid messageContentSchema for message content`),
    )();

    if (parsedMessageContent.isErr()) {
      return err(parsedMessageContent.error);
    }

    return ok(toMessageContent(parsedMessageContent.value));
  }

  async getMessagesContentByIds(
    messageIDs: string[],
  ): Promise<
    Result<
      Map<string, Result<MessageContent, MalformedEntityError | NotFoundError>>,
      GenericError | TooManyRequestsError
    >
  > {
    const results = await Promise.all(
      messageIDs.map((messageID) => this.#getContentById(messageID)),
    );

    const contentById = new Map<
      string,
      Result<MessageContent, MalformedEntityError | NotFoundError>
    >();

    for (let index = 0; index < messageIDs.length; index++) {
      const messageID = messageIDs[index];
      const result = results[index];

      if (result.isErr()) {
        // Skippable errors (missing/malformed content) are reported per-item so
        // the business layer can decide whether to skip the message or fail.
        if (
          result.error instanceof NotFoundError ||
          result.error instanceof MalformedEntityError
        ) {
          contentById.set(messageID, err(result.error));
          continue;
        }

        // Fatal errors fail the whole operation.
        return err(result.error);
      }

      contentById.set(messageID, ok(result.value));
    }

    return ok(contentById);
  }
}
