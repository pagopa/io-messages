import * as z from "zod";

//TODO: move this into a common package
export const fiscalCodeSchema = z
  .string()
  .regex(
    /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/,
    "Must be a valid Italian fiscal code",
  )
  .brand("FiscalCode");

export type FiscalCode = z.infer<typeof fiscalCodeSchema>;

const rejectionReasonSchema = z
  .enum(["SERVICE_NOT_ALLOWED", "USER_NOT_FOUND", "UNKNOWN"])
  .default("UNKNOWN");

const rejectedMessageStatusSchema = z.object({
  fiscalCode: fiscalCodeSchema,
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().min(1),
  rejection_reason: rejectionReasonSchema,
  status: z.literal("REJECTED"),
  updatedAt: z.number(),
});

const notRejectedMessageStatusValueEnum = z.enum([
  "ACCEPTED",
  "THROTTLED",
  "FAILED",
  "PROCESSED",
]);

const notRejectedMessageStatusSchema = z.object({
  fiscalCode: fiscalCodeSchema,
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().min(1),
  status: notRejectedMessageStatusValueEnum,
  updatedAt: z.number(),
});

export const messageStatusSchema = z.discriminatedUnion("status", [
  notRejectedMessageStatusSchema,
  rejectedMessageStatusSchema,
]);
export type MessageStatus = z.TypeOf<typeof messageStatusSchema>;
