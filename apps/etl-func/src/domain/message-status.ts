import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import * as z from "zod";

const rejectionReasonSchema = z
  .enum(["SERVICE_NOT_ALLOWED", "USER_NOT_FOUND", "UNKNOWN"])
  .default("UNKNOWN");

export const statusEnum = z.enum([
  "ACCEPTED",
  "THROTTLED",
  "FAILED",
  "PROCESSED",
  "REJECTED",
]);

export const messageStatusIdSchema = z
  .string()
  .regex(
    /^[0-9A-HJKMNP-TV-Z]{26}-\d{16}$/,
    "Invalid format. Expected <ULID-Number>",
  );

export const messageStatusSchema = z
  .object({
    fiscalCode: fiscalCodeSchema.optional(),
    id: messageStatusIdSchema,
    isArchived: z.boolean().default(false),
    isRead: z.boolean().default(false),
    messageId: z.string().ulid(),
    updatedAt: z.coerce.date(),
    version: z.number().gte(0),
  })
  .and(
    z.discriminatedUnion("status", [
      z.object({
        status: statusEnum.exclude(["REJECTED"]),
      }),
      z.object({
        rejection_reason: rejectionReasonSchema,
        status: statusEnum.extract(["REJECTED"]),
      }),
    ]),
  );
export type MessageStatus = z.TypeOf<typeof messageStatusSchema>;
