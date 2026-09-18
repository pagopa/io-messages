import {
  PaymentInfo,
  paymentInfoSchema,
} from "io-messages-common/domain/payment";
import z from "zod";

export const GetPaymentInfoResponseSchema = paymentInfoSchema;
export type GetPaymentInfoResponse = z.TypeOf<
  typeof GetPaymentInfoResponseSchema
>;

export const toGetPaymentInfoResponse = (
  paymentInfo: PaymentInfo,
): GetPaymentInfoResponse => paymentInfo;
