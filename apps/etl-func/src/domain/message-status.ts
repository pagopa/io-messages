import * as z from "zod";

const rejectionReasonSchema = z
  .enum(["SERVICE_NOT_ALLOWED", "USER_NOT_FOUND", "UNKNOWN"])
  .default("UNKNOWN");

const rejectedMessageStatusSchema = z.object({
  fiscalCode: z.string().min(1).optional(),
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().min(1),
  updatedAt: z.number(),
  rejection_reason: rejectionReasonSchema,
  status: z.literal("REJECTED"),
});

const notRejectedMessageStatusValueEnum = z.enum([
  "ACCEPTED",
  "THROTTLED",
  "FAILED",
  "PROCESSED",
]);

const notRejectedMessageStatusSchema = z.object({
  fiscalCode: z.string().min(1).optional(),
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().min(1),
  updatedAt: z.number(),
  status: notRejectedMessageStatusValueEnum,
});

export const messageStatusSchema = z.discriminatedUnion("status", [
  notRejectedMessageStatusSchema,
  rejectedMessageStatusSchema,
]);
export type MessageStatus = z.TypeOf<typeof messageStatusSchema>;
