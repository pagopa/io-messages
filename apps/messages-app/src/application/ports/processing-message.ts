import { GenericError } from "@pagopa/hexagonal-core";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { messageIDSchema } from "io-messages-common/domain/message";
import {
  noticeNumberSchema,
  payeeSchema,
  paymentAmountSchema,
} from "io-messages-common/domain/payment";
import {
  organizationFiscalCodeSchema,
  organizationNameSchema,
} from "io-messages-common/domain/service";
import { thirdPartyDataSchema } from "io-messages-common/domain/third-party-data";
import { Result } from "neverthrow";
import z from "zod";

const messageContentSchema = z.object({
  due_date: z.iso.datetime().optional(),
  eu_covid_cert: z.object({ auth_code: z.string() }).optional(),
  markdown: z.string().min(80).max(10000),
  payment_data: z
    .object({
      amount: paymentAmountSchema,
      invalid_after_due_date: z.boolean().optional(),
      notice_number: noticeNumberSchema,
      payee: payeeSchema.optional(),
    })
    .optional(),
  require_secure_channels: z.boolean().optional(),
  subject: z.string().min(10).max(120),
  third_party_data: thirdPartyDataSchema.optional(),
});

const messageWithoutContentSchema = z.object({
  createdAt: z.iso.datetime(),
  featureLevelType: z.enum(["ADVANCED", "STANDARD"]),
  fiscalCode: fiscalCodeSchema,
  id: messageIDSchema,
  indexedId: messageIDSchema,
  isPending: z.boolean().optional(),
  kind: z.literal("INewMessageWithoutContent").optional(),
  senderServiceId: z.string().min(1),
  senderUserId: z.string().min(1),
  timeToLiveSeconds: z.number().int().min(3600).max(604800),
});

const senderMetadataSchema = z.object({
  organizationFiscalCode: organizationFiscalCodeSchema,
  organizationName: organizationNameSchema,
  //TODO: Check if this should be optional.
  requireSecureChannels: z.boolean(),
  //TODO: Check if there should be a ddefault.
  serviceCategory: z.enum(["SPECIAL", "STANDARD"]),
  serviceName: z.string().min(1),
  serviceUserEmail: z.email(),
});

export const processingMessagePayloadSchema = z.object({
  content: messageContentSchema,
  message: messageWithoutContentSchema,
  senderMetadata: senderMetadataSchema,
});
export type ProcessingMessagePayload = z.TypeOf<
  typeof processingMessagePayloadSchema
>;

export interface ProcessingMessagePayloadStore {
  /**
   * Stores the payload required to process the message, using its message id as
   * identifier.
   *
   * Returns a `GenericError` when the payload cannot be stored.
   */
  savePayload: (
    payload: ProcessingMessagePayload,
  ) => Promise<Result<void, GenericError>>;
}
