import { lollipopHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import * as z from "zod";

export const attachmentNameSchema = z.enum(["PAGOPA", "F24"]);
export type AttachmentName = z.TypeOf<typeof attachmentNameSchema>;

export const mandateIdSchema = z.string().uuid();
export type MandateId = z.TypeOf<typeof mandateIdSchema>;

export const idxSchema = z.number().int();
export type Idx = z.TypeOf<typeof idxSchema>;

export const attachmentMetadataSchema = z.object({
  contentLength: z.number().int(),
  contentType: z.string(),
  filename: z.string(),
  retryAfter: z.number().int().optional(),
  sha256: z.string(),
  url: z.string().optional(),
});

export type AttachmentMetadata = z.TypeOf<typeof attachmentMetadataSchema>;

export const aarQrCodeValueSchema = z
  .string()
  .max(300)
  .regex(/^[ -~]*$/);
export type AarQrCodeValue = z.TypeOf<typeof aarQrCodeValueSchema>;

export const iunSchema = z
  .string()
  .min(25)
  .max(25)
  .regex(/^[A-Z]{4}-[A-Z]{4}-[A-Z]{4}-[0-9]{6}-[A-Z]{1}-[0-9]{1}$/);
export type Iun = z.TypeOf<typeof iunSchema>;

export const userInfoSchema = z.object({
  denomination: z.string(),
  taxId: z.string(),
});

export type UserInfo = z.TypeOf<typeof userInfoSchema>;

export const checkQrMandateResponseSchema = z.object({
  iun: iunSchema,
  mandateId: mandateIdSchema.optional(),
  recipientInfo: userInfoSchema,
});
export type CheckQrMandateResponse = z.TypeOf<
  typeof checkQrMandateResponseSchema
>;

export const sendHeadersSchema = z.object({
  ...lollipopHeadersSchema.shape,
  "x-pagopa-cx-taxid": fiscalCodeSchema,
  "x-pagopa-pn-io-src": z.string().optional(),
});
export type SendHeaders = z.TypeOf<typeof sendHeadersSchema>;

export const thirdPartyMessageSchema = z.object({
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
    iun: iunSchema,
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
});

export type ThirdPartyMessage = z.TypeOf<typeof thirdPartyMessageSchema>;

export const mandateCreationResponseSchema = z.object({
  mandate: z.object({
    dateTo: z.string(),
    mandateId: mandateIdSchema,
    verificationCode: z
      .string()
      .max(5)
      .regex(/^[0-9]*$/),
  }),
  requestTTL: z.int(),
});

export type MandateCreationResponse = z.TypeOf<
  typeof mandateCreationResponseSchema
>;

export const CIEValidationDataSchema = z.object({
  mrtdData: z.object({
    dg1: z.string(),
    dg11: z.string(),
    sod: z.string(),
  }),
  nisData: z.object({
    nis: z.string(),
    pub_key: z.string(),
    sod: z.string(),
  }),
  signedNonce: z.string(),
});

export type CIEValidationData = z.TypeOf<typeof CIEValidationDataSchema>;

export interface NotificationClient {
  acceptNotificationMandate(
    mandateId: MandateId,
    CIEValidationdata: CIEValidationData,
    headers: SendHeaders,
  ): Promise<unknown>;

  checkAarQrCodeIO(
    aarQrCodeValue: AarQrCodeValue,
    headers: SendHeaders,
  ): Promise<CheckQrMandateResponse>;

  createNotificationMandate(
    aarQrCodeValue: AarQrCodeValue,
    headers: SendHeaders,
  ): Promise<MandateCreationResponse>;

  getReceivedNotification(
    iun: string,
    headers: SendHeaders,
    mandateId?: string,
  ): Promise<ThirdPartyMessage>;

  getReceivedNotificationAttachment(
    iun: string,
    attachmentName: AttachmentName,
    headers: SendHeaders,
    options?: { attachmentIdx?: number; mandateId?: MandateId },
  ): Promise<AttachmentMetadata>;

  getReceivedNotificationDocument(
    iun: Iun,
    docIdx: Idx,
    headers: SendHeaders,
    mandateId?: MandateId,
  ): Promise<AttachmentMetadata>;
}
