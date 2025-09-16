import { z } from "zod";

export const attachmentNameSchema = z.enum(["PAGOPA", "F24"]);
export type AttachmentName = z.TypeOf<typeof attachmentNameSchema>;

export const mandateIdSchema = z.string().uuid();
export type MandateId = z.TypeOf<typeof mandateIdSchema>;

export const docIdxSchema = z.number().int();
export type DocIdx = z.TypeOf<typeof docIdxSchema>;

export const iunSchema = z
  .string()
  .min(25)
  .max(25)
  .regex(/^[A-Z]{4}-[A-Z]{4}-[A-Z]{4}-[0-9]{6}-[A-Z]{1}-[0-9]{1}$/);
export type Iun = z.TypeOf<typeof iunSchema>;

export const attachmentMetadataResponseSchema = z.object({
  contentLength: z.number().int(),
  contentType: z.string(),
  filename: z.string(),
  retryAfter: z.number().int().optional(),
  sha256: z.string(),
  url: z.string().optional(),
});

export type AttachmentMetadataResponse = z.TypeOf<
  typeof attachmentMetadataResponseSchema
>;

export const problemSchema = z.object({
  detail: z
    .string()
    .max(4096)
    .regex(/^.{0,4096}$/)
    .optional(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        detail: z.string().max(1024).optional(),
        element: z.string().optional(),
      }),
    )
    .min(1),
  status: z.number().int().gte(100).lt(600),
  timestamp: z.string().datetime({ offset: true }).optional(),
  title: z
    .string()
    .max(64)
    .regex(/^[ -~]{0,64}$/)
    .optional(),
  traceId: z.string().optional(),
  type: z.string().optional(),
});

export type Problem = z.TypeOf<typeof problemSchema>;

export const thirdPartyMessageSchema = z
  .object({
    attachments: z.array(
      z.object({
        category: z.enum(["DOCUMENT", "F24"]),
        content_type: z.string().min(1).optional(),
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        url: z.string().min(1),
      }),
    ),
    details: z.object({
      abstract: z.string().optional(),
      completedPayments: z
        .array(z.string().min(18).max(18).regex(/^\d+$/))
        .optional(),
      isCancelled: z.boolean().optional(),
      iun: z.string(),
      notificationStatusHistory: z.array(
        z.object({
          activeFrom: z.string().datetime({ offset: true }),
          relatedTimelineElements: z.array(z.string()),
          status: z.string(),
        }),
      ),
      recipients: z.array(
        z.object({
          denomination: z.string().min(1).regex(/^.*$/),
          payment: z
            .object({
              creditorTaxId: z.string().min(11).max(11).regex(/^\d+$/),
              noticeCode: z.string().min(18).max(18).regex(/^\d+$/),
            })

            .optional(),
          recipientType: z.string(),
          taxId: z
            .string()
            .min(11)
            .max(16)
            .regex(
              /^([A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z]{1}[0-9LMNPQRSTUV]{2}[A-Z]{1}[0-9LMNPQRSTUV]{3}[A-Z]{1})|([0-9]{11})$/,
            ),
        }),
      ),
      senderDenomination: z.string().optional(),
      subject: z.string(),
    }),
  })
  .partial();

export type ThirdPartyMessage = z.TypeOf<typeof thirdPartyMessageSchema>;

export const checkQrMandateRequestSchema = z.object({
  aarQrCodeValue: z
    .string()
    .max(300)
    .regex(/^[ -~]*$/),
});

export type CheckQrMandateRequest = z.TypeOf<
  typeof checkQrMandateRequestSchema
>;

export const userInfoSchema = z
  .object({ denomination: z.string(), taxId: z.string() })
  .partial();

export type UserInfo = z.TypeOf<typeof userInfoSchema>;

export const checkQrMandateResponseSchema = z.object({
  iun: iunSchema,
  mandateId: mandateIdSchema.optional(),
  recipientInfo: userInfoSchema,
});
export type CheckQrMandateResponse = z.TypeOf<
  typeof checkQrMandateResponseSchema
>;
