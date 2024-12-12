import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import * as z from "zod";

const rejectionReasonSchema = z
  .enum(["SERVICE_NOT_ALLOWED", "USER_NOT_FOUND", "UNKNOWN"])
  .default("UNKNOWN");

const statusEnum = z.enum([
  "ACCEPTED",
  "THROTTLED",
  "FAILED",
  "PROCESSED",
  "REJECTED",
]);

const rejectedMessageStatusSchema = z.object({
  fiscalCode: fiscalCodeSchema,
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().ulid(),
  rejection_reason: rejectionReasonSchema,
  status: statusEnum.extract(["REJECTED"]),
  updatedAt: z.number(),
});

const notRejectedMessageStatusSchema = z.object({
  fiscalCode: fiscalCodeSchema,
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().ulid(),
  status: statusEnum.exclude(["REJECTED"]),
  updatedAt: z.number(),
});

export const messageStatusSchema = z.discriminatedUnion("status", [
  notRejectedMessageStatusSchema,
  rejectedMessageStatusSchema,
]);
export type MessageStatus = z.TypeOf<typeof messageStatusSchema>;
