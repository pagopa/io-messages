import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
import z from "zod";

export const hasPreconditionSchema = z
  .enum(["ALWAYS", "ONCE", "NEVER"])
  .optional();
export type HasPrecondition = z.TypeOf<typeof hasPreconditionSchema>;

export const messageContentSchema = z.object({
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
      has_precondition: hasPreconditionSchema,
      has_remote_content: z.boolean().default(false),
      id: z.string().min(1),
      original_receipt_date: z.string().optional(),
      original_sender: z.string().min(1).optional(),
      summary: z.string().min(1).optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
});
export type MessageContent = z.TypeOf<typeof messageContentSchema>;

export interface MessageContentRepository {
  /**
   * Returns the contents of the messages identified by the provided message
   * ids. The blobs are retrieved in parallel.
   *
   * The result is a map keyed by message id containing one entry for each
   * requested id. Each entry is itself a `Result`: `ok` with the content, or
   * `err` with a `NotFoundError`/`ValidationError` when the content is missing
   * or malformed. This lets the business layer decide whether to skip such
   * messages or fail. Fatal errors (e.g. throttling) short-circuit and fail the
   * whole operation.
   */
  getMessagesContentByIds(
    messageIDs: string[],
  ): Promise<
    Result<
      Map<string, Result<MessageContent, NotFoundError | ValidationError>>,
      GenericError | TooManyRequestsError
    >
  >;
}
