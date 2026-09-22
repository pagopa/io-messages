import { PaymentInfo } from "io-messages-common/domain/payment";
import z from "zod";

const paymentProblemSchema = z.object({
  faultCodeCategory: z.string(),
  faultCodeDetail: z.string(),
  title: z.string().optional(),
});

export const PaymentInfoNotFoundResponseSchema = paymentProblemSchema.extend({
  faultCodeCategory: z.enum(["PAYMENT_DATA_ERROR", "PAYMENT_UNKNOWN"]),
});

export type PaymentInfoNotFoundResponse = z.TypeOf<
  typeof PaymentInfoNotFoundResponseSchema
>;

export const PaymentInfoConflictResponseSchema = paymentProblemSchema.extend({
  faultCodeCategory: z.enum([
    "PAYMENT_CANCELED",
    "PAYMENT_DUPLICATED",
    "PAYMENT_EXPIRED",
    "PAYMENT_ONGOING",
  ]),
});

export type PaymentInfoConflictResponse = z.TypeOf<
  typeof PaymentInfoConflictResponseSchema
>;

export const PaymentInfoBadGatewayResponseSchema = paymentProblemSchema.extend({
  faultCodeCategory: z.enum(["GENERIC_ERROR", "PAYMENT_UNAVAILABLE"]),
});

export type PaymentInfoBadGatewayResponse = z.TypeOf<
  typeof PaymentInfoBadGatewayResponseSchema
>;

export const PartyConfigurationFaultPaymentProblemJsonSchema =
  paymentProblemSchema.extend({
    faultCodeCategory: z.literal("DOMAIN_UNKNOWN"),
  });

export type PartyConfigurationFaultPaymentProblemJson = z.TypeOf<
  typeof PartyConfigurationFaultPaymentProblemJsonSchema
>;

export const PaymentInfoInternalErrorResponseSchema = z.object({
  detail: z.string().optional(),
  instance: z.string().optional(),
  status: z.number().int().min(100).max(599).optional(),
  title: z.string().optional(),
  type: z.string().optional(),
});

export type PaymentInfoInternalErrorResponse = z.TypeOf<
  typeof PaymentInfoInternalErrorResponseSchema
>;

export const GetPaymentInfoResponseSchema = z.object({
  amount: z.number(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  paFiscalCode: z.string().optional(),
  paName: z.string().optional(),
  rptId: z.string().optional(),
});
export type GetPaymentInfoResponse = z.TypeOf<
  typeof GetPaymentInfoResponseSchema
>;

export const toGetPaymentInfoResponse = (
  paymentInfo: PaymentInfo,
): GetPaymentInfoResponse => paymentInfo;
