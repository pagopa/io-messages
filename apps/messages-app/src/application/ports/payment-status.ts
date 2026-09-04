import { GenericError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
import z from "zod";

export const paymentStatusSchema = z.enum(["PAID", "NOT_PAID"]);
export type PaymentStatus = z.TypeOf<typeof paymentStatusSchema>;

export interface PaymentStatusRepository {
  getPaymentStatus(rptId: string): Promise<Result<PaymentStatus, GenericError>>;
}
