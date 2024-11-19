import * as z from "zod";

const commonMessageStatusSchema = z.object({
  fiscalCode: z.string().min(1).optional(),
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().min(1),
  updatedAt: z.number(),
});

const rejectionReasonSchema = z
  .enum(["SERVICE_NOT_ALLOWED", "USER_NOT_FOUND", "UNKNOWN"])
  .default("UNKNOWN");

const rejectedMessageStatusSchema = z.intersection(
  commonMessageStatusSchema,
  z.object({
    rejection_reason: rejectionReasonSchema,
    status: z.literal("REJECTED"),
  }),
);

const notRejectedMessageStatusValueEnum = z.enum([
  "ACCEPTED",
  "THROTTLED",
  "FAILED",
  "PROCESSED",
]);

const notRejectedMessageStatusSchema = z.intersection(
  commonMessageStatusSchema,
  z.object({
    status: notRejectedMessageStatusValueEnum,
  }),
);

export const messageStatusSchema = z.union([
  rejectedMessageStatusSchema,
  notRejectedMessageStatusSchema,
]);
export type Status = z.TypeOf<typeof messageStatusSchema>;
