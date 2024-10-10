import * as z from "zod";

const messageContentSchema = z.object({
  payment_data: z
    .object({
      amount: z.number().int().min(0).max(9999999999),
      notice_number: z.string().regex(new RegExp("^[0123][0-9]{17}$")),
      invalid_after_due_date: z.boolean().default(false),
      payee: z
        .object({
          fiscal_code: z.string().regex(new RegExp("^[0-9]{11}$")).optional(),
        })
        .optional(),
    })
    .optional(),
  prescription_data: z
    .object({
      nre: z.string(),
      iup: z.string().optional(),
      prescriber_fiscal_code: z
        .string()
        .regex(
          new RegExp(
            "^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$",
          ),
        )
        .optional(),
    })
    .optional(),
  legal_data: z
    .object({
      sender_mail_from: z.string().min(1),
      has_attachments: z.boolean().default(false),
      message_unique_id: z.string().min(1),
      original_message_url: z.string().min(1).optional(),
      pec_server_service_id: z.string().min(1).optional(),
    })
    .optional(),
  eu_covid_cert: z.object({ auth_code: z.string().optional() }).optional(),
  third_party_data: z
    .object({
      id: z.string().min(1),
      original_sender: z.string().min(1).optional(),
      original_receipt_date: z.any().optional(),
      has_attachments: z.boolean().default(false),
      has_remote_content: z.boolean().default(false),
      has_precondition: z.enum(["ALWAYS", "ONCE", "NEVER"]).optional(),
      summary: z.string().min(1).optional(),
      configuration_id: z
        .string()
        .regex(new RegExp("^[0-9A-HJKMNP-TV-Z]{26}$"))
        .describe("ulid")
        .optional(),
    })
    .optional(),
  tymestamp: z.string().optional(),
  required: z.any().optional(),
});

/**
 * A type that collect all the properties needed for the extract message use-case
 * that can be found inside the message-content blob
 * */
export type MessageContent = z.TypeOf<typeof messageContentSchema>;
