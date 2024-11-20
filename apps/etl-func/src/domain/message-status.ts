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

const statusEnum = z.enum([
  "ACCEPTED",
  "THROTTLED",
  "FAILED",
  "PROCESSED",
  "REJECTED",
]);

const rejectedMessageStatusSchema = z.object({
  fiscalCode: fiscalCodeSchema,
  id: z.string().min(1),
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().ulid(),
  rejection_reason: rejectionReasonSchema,
  status: statusEnum.extract(["REJECTED"]),
  updatedAt: z.number(),
  version: z.number().gte(0),
});

const notRejectedMessageStatusSchema = z.object({
  fiscalCode: fiscalCodeSchema,
  id: z.string().min(1),
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().ulid(),
  status: statusEnum.exclude(["REJECTED"]),
  updatedAt: z.number(),
  version: z.number().gte(0),
});

export const messageStatusSchema = z.discriminatedUnion("status", [
  notRejectedMessageStatusSchema,
  rejectedMessageStatusSchema,
]);
export type MessageStatus = z.TypeOf<typeof messageStatusSchema>;

export const messageStatusEventOperationSchema = z.enum([
  "CREATE",
  "UPDATE",
  "DELETE",
]);
export type MessageStatusEventOperation = z.TypeOf<
  typeof messageStatusEventOperationSchema
>;

export const messageStatusEventSchema = z.object({
  created_at: z.number(),
  id: z.string().min(1),
  is_archived: z.boolean(),
  is_read: z.boolean(),
  message_id: z.string().ulid(),
  op: z.enum(["CREATE", "UPDATE", "DELETE"]),
  schema_version: z.number().default(1),
  status: statusEnum,
  timestamp: z.number(),
  version: z.number().gte(0),
});
export type MessageStatusEvent = z.TypeOf<typeof messageStatusEventSchema>;
