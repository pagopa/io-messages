import {
  FiscalCodeSchema,
  NonEmptyStringSchema,
} from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

import { organizationFiscalCodeSchema } from "../domain/service.js";

const fiscalCodeSchema: z.ZodType<string> = FiscalCodeSchema;
const nonEmptyStringSchema: z.ZodType<string> = NonEmptyStringSchema;

const SendNotificationAttachmentSchema = z
  .object({
    category: z.preprocess(
      (value) => value ?? "DOCUMENT",
      z
        .string()
        .min(2)
        .regex(/[A-Z0-9_]+/)
        .optional(),
    ),
    content_type: nonEmptyStringSchema.optional(),
    id: nonEmptyStringSchema,
    name: nonEmptyStringSchema.optional(),
    url: nonEmptyStringSchema,
  })
  .loose();

const SendNotificationPaymentInfoSchema = z
  .object({
    creditorTaxId: organizationFiscalCodeSchema,
    noticeCode: z.string().length(18).regex(/^\d+$/),
  })
  .loose();

const SendNotificationRecipientSchema = z
  .object({
    denomination: z
      .string()
      .min(1)
      .max(80)
      .regex(/^([\x20-\xFF]{1,80})$/),
    payment: SendNotificationPaymentInfoSchema.optional(),
    recipientType: z.string(),
    taxId: z.union([fiscalCodeSchema, organizationFiscalCodeSchema]),
  })
  .loose();

const SendNotificationStatusHistoryElementSchema = z
  .object({
    activeFrom: z.iso.datetime({ offset: true }),
    relatedTimelineElements: z.array(z.string()),
    status: z.string(),
  })
  .loose();

const SendNotificationDetailsSchema = z
  .object({
    abstract: z.string().optional(),
    completedPayments: z.array(z.string()).optional(),
    isCancelled: z.boolean().optional(),
    iun: z.string(),
    notificationStatusHistory: z.array(
      SendNotificationStatusHistoryElementSchema,
    ),
    recipients: z.array(SendNotificationRecipientSchema),
    senderDenomination: z.string().optional(),
    subject: z.string(),
  })
  .loose();

export const SendNotificationResponseSchema = z
  .object({
    attachments: z.array(SendNotificationAttachmentSchema).optional(),
    details: SendNotificationDetailsSchema.optional(),
  })
  .loose();

export type SendNotificationResponse = z.infer<
  typeof SendNotificationResponseSchema
>;
