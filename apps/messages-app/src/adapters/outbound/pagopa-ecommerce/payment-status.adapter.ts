import { GenericError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import {
  PaymentStatus,
  PaymentStatusRepository,
} from "../../../application/ports/payment-status.js";

const paymentResponseSchema = z.object({
  amount: z.number().int().min(0).max(99_999_999),
  description: z.string().min(1).max(141).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-(1[0-2]|0[1-9])-(0[1-9]|[12]\d|3[01])$/)
    .optional(),
  paFiscalCode: z.string().min(11).max(12).optional(),
  paName: z.string().min(1).max(141).optional(),
  rptId: z
    .string()
    .regex(/^([a-zA-Z\d]{1,35}|RF\d{2}[a-zA-Z\d]{1,21})$/)
    .optional(),
});

const paymentNotFoundSchema = z.discriminatedUnion("faultCodeCategory", [
  z.object({
    faultCodeCategory: z.literal("PAYMENT_DATA_ERROR"),
    faultCodeDetail: z.enum([
      "PPT_SINTASSI_EXTRAXSD",
      "PPT_SINTASSI_XSD",
      "PPT_DOMINIO_SCONOSCIUTO",
      "PPT_STAZIONE_INT_PA_SCONOSCIUTA",
    ]),
    title: z.string().optional(),
  }),
  z.object({
    faultCodeCategory: z.literal("PAYMENT_UNKNOWN"),
    faultCodeDetail: z.literal("PAA_PAGAMENTO_SCONOSCIUTO"),
    title: z.string().optional(),
  }),
]);

const paymentConflictSchema = z.discriminatedUnion("faultCodeCategory", [
  z.object({
    faultCodeCategory: z.literal("PAYMENT_ONGOING"),
    faultCodeDetail: z.enum([
      "PPT_PAGAMENTO_IN_CORSO",
      "PAA_PAGAMENTO_IN_CORSO",
    ]),
    title: z.string().optional(),
  }),
  z.object({
    faultCodeCategory: z.literal("PAYMENT_EXPIRED"),
    faultCodeDetail: z.literal("PAA_PAGAMENTO_SCADUTO"),
    title: z.string().optional(),
  }),
  z.object({
    faultCodeCategory: z.literal("PAYMENT_CANCELED"),
    faultCodeDetail: z.literal("PAA_PAGAMENTO_ANNULLATO"),
    title: z.string().optional(),
  }),
  z.object({
    faultCodeCategory: z.literal("PAYMENT_DUPLICATED"),
    faultCodeDetail: z.enum([
      "PAA_PAGAMENTO_DUPLICATO",
      "PPT_PAGAMENTO_DUPLICATO",
    ]),
    title: z.string().optional(),
  }),
]);

export class PagoPaEcommercePaymentStatusAdapter
  implements PaymentStatusRepository
{
  constructor(
    private baseURL: URL,
    private apiKey: string,
  ) {}

  async getPaymentStatus(
    rptId: string,
  ): Promise<Result<PaymentStatus, GenericError>> {
    const paymentRequestURL = new URL(this.baseURL);
    paymentRequestURL.pathname = `${paymentRequestURL.pathname.replace(/\/$/, "")}/payment-requests/${rptId}`;

    const responseResult = await ResultAsync.fromPromise(
      fetch(paymentRequestURL, {
        headers: { "Ocp-Apim-Subscription-Key": this.apiKey },
        signal: AbortSignal.timeout(10_000),
      }),
      (error) =>
        new GenericError(
          `error retrieving payment status for rptId ${rptId}: ${String(error)}`,
        ),
    );
    if (responseResult.isErr()) return err(responseResult.error);

    const response = responseResult.value;
    if (
      response.status === 200 ||
      response.status === 404 ||
      response.status === 409
    ) {
      const bodyResult = await ResultAsync.fromPromise(
        response.json(),
        () =>
          new GenericError(
            `invalid response retrieving payment status for rptId ${rptId}`,
          ),
      );
      if (bodyResult.isErr()) return err(bodyResult.error);

      const parsedResponse =
        response.status === 200
          ? paymentResponseSchema.safeParse(bodyResult.value)
          : response.status === 404
            ? paymentNotFoundSchema.safeParse(bodyResult.value)
            : paymentConflictSchema.safeParse(bodyResult.value);
      if (!parsedResponse.success) {
        return err(
          new GenericError(
            `malformed response retrieving payment status for rptId ${rptId}`,
          ),
        );
      }

      if (response.status !== 409) return ok("NOT_PAID");

      const conflictResponse = paymentConflictSchema.parse(bodyResult.value);
      return ok(
        conflictResponse.faultCodeCategory === "PAYMENT_DUPLICATED"
          ? "PAID"
          : "NOT_PAID",
      );
    }

    return err(
      new GenericError(
        `unexpected response retrieving payment status for rptId ${rptId}: ${response.status}`,
      ),
    );
  }
}
