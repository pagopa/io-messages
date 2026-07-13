import { GenericError, TooManyRequestsError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
import z from "zod";

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

export const messageStatusSchema = z.object({
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().min(1),
  status: messageStatusValueSchema,
  updatedAt: z.string(),
  version: z.number(),
});
export type MessageStatus = z.TypeOf<typeof messageStatusSchema>;

export interface MessageStatusRepository {
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
