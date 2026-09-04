import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { messageIDSchema } from "io-messages-common/domain/message";
import {
  noticeNumberSchema,
  payeeSchema,
  paymentAmountSchema,
} from "io-messages-common/domain/payment";
import { thirdPartyDataSchema } from "io-messages-common/domain/third-party-data";
import z from "zod";

export const createMessagePermissionSchema = z.enum([
  "ApiLimitedMessageWrite",
  "ApiMessageWrite",
  "ApiMessageWriteAdvanced",
  "ApiMessageWriteEUCovidCert",
  "ApiMessageWriteWithPayee",
  "ApiThirdPartyMessageWrite",
]);
export type CreateMessagePermission = z.TypeOf<
  typeof createMessagePermissionSchema
>;

const paymentDataSchema = z.object({
  amount: paymentAmountSchema.min(1),
  invalid_after_due_date: z.boolean().default(false),
  notice_number: noticeNumberSchema,
  payee: payeeSchema.optional(),
});

const newMessageThirdPartyDataSchema = thirdPartyDataSchema.extend({
  has_attachments: z.boolean().default(false),
  has_remote_content: z.boolean().default(false),
});

export const newMessageContentSchema = z.object({
  due_date: z.iso.datetime().optional(),
  eu_covid_cert: z
    .object({
      auth_code: z.string(),
    })
    .optional(),
  markdown: z.string().min(80).max(10000),
  payment_data: paymentDataSchema.optional(),
  require_secure_channels: z.boolean().optional(),
  subject: z.string().min(10).max(120),
  third_party_data: newMessageThirdPartyDataSchema.optional(),
});
export type NewMessageContent = z.TypeOf<typeof newMessageContentSchema>;

export const newMessageSchema = z.object({
  content: newMessageContentSchema,
  default_addresses: z
    .object({
      email: z.email().optional(),
    })
    .optional(),
  feature_level_type: z.enum(["STANDARD", "ADVANCED"]).default("STANDARD"),
  fiscal_code: fiscalCodeSchema.optional(),
  time_to_live: z.number().int().min(3600).max(604800).default(3600),
});
export type NewMessage = z.TypeOf<typeof newMessageSchema>;

export const createdMessageSchema = z.object({
  id: messageIDSchema,
});
export type CreatedMessage = z.TypeOf<typeof createdMessageSchema>;
