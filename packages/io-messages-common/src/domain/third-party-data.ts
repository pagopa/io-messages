import z from "zod";

export const thirdPartyDataSchema = z.object({
  configuration_id: z.ulid().optional(),
  has_attachments: z.boolean().optional(),
  has_precondition: z.enum(["ALWAYS", "ONCE", "NEVER"]).optional(),
  has_remote_content: z.boolean().optional(),
  id: z.string().min(1),
  original_receipt_date: z.iso.datetime().optional(),
  original_sender: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
});
