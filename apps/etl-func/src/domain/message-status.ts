import { throws } from "assert";
import * as z from "zod";

const commonMessageStatusSchema = z.object({
  messageId: z.string().min(1),
  updatedAt: z.number(),
  isRead: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  fiscalCode: z.string().min(1).optional(),
});

const rejectionReasonSchema = z
  .enum(["SERVICE_NOT_ALLOWED", "USER_NOT_FOUND", "UNKNOWN"])
  .default("UNKNOWN");

const rejectedMessageStatusSchema = z.intersection(
  commonMessageStatusSchema,
  z.object({
    status: z.literal("REJECTED"),
    rejection_reason: rejectionReasonSchema,
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
