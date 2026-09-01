import {
  ConflictError,
  FiscalCodeSchema,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
import z from "zod";

import { MalformedEntityError } from "./error.js";

export const notRejectedMessageStatusValueSchema = z.enum([
  "ACCEPTED",
  "THROTTLED",
  "FAILED",
  "PROCESSED",
]);

export const rejectedMessageStatusValueSchema = z.literal("REJECTED");

export const messageStatusValueSchema = z.union([
  rejectedMessageStatusValueSchema,
  notRejectedMessageStatusValueSchema,
]);
export type MessageStatusValue = z.TypeOf<typeof messageStatusValueSchema>;

export const messageStatusIdSchema = z
  .string()
  .regex(/^[0-9A-HJKMNP-TV-Z]{26}-\d{16}$/);

export const createMessageStatusId = (
  messageId: string,
  version: number,
): string => `${messageId}-${String(version).padStart(16, "0")}`;

export const messageStatusSchema = z.object({
  fiscalCode: FiscalCodeSchema.optional(),
  id: messageStatusIdSchema,
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.ulid(),
  status: messageStatusValueSchema,
  updatedAt: z.string(),
  version: z.int().nonnegative(),
});
export type MessageStatus = z.TypeOf<typeof messageStatusSchema>;

export interface MessageStatusRepository {
  /**
   * Creates the provided message status as a new immutable version.
   *
   * Returns a `ConflictError` when the version already
   * exists and must not be overwritten.
   */
  createMessageStatus(
    messageStatus: MessageStatus,
  ): Promise<
    Result<MessageStatus, ConflictError | GenericError | TooManyRequestsError>
  >;

  /**
   * Returns the latest version of the status for the single message identified
   * by the provided `messageId`.
   *
   * Returns a `NotFoundError` when no status exists for the message, a
   * `MalformedEntityError` when the stored document cannot be parsed.
   */
  getLatestMessageStatusById(
    messageId: string,
  ): Promise<
    Result<
      MessageStatus,
      GenericError | MalformedEntityError | NotFoundError | TooManyRequestsError
    >
  >;

  /**
   * Returns the latest version of the status for each of the messages
   * identified by the provided message ids.
   *
   * In case of missing statuses or invalid shape they are simply ignored.
   */
  getLatestMessagesStatusByIds(
    messageIDs: string[],
  ): Promise<Result<MessageStatus[], GenericError | TooManyRequestsError>>;
}
