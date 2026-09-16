import z from "zod";

export const rptIdSchema = z
  .string()
  .regex(/^(?:[a-zA-Z\d]{1,35}|RF\d{2}[a-zA-Z\d]{1,21})$/);

export const paymentInfoSchema = z.object({
  amount: z.number().int().min(0).max(99_999_999),
  description: z.string().min(1).max(140),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paFiscalCode: z.string().regex(/^\d{11}$/),
  paName: z.string().min(1).max(140),
  rptId: rptIdSchema.optional(),
});

export type PaymentInfo = z.TypeOf<typeof paymentInfoSchema>;

export const GetPaymentInfoResponseSchema = paymentInfoSchema;
export type GetPaymentInfoResponse = z.TypeOf<
  typeof GetPaymentInfoResponseSchema
>;

export const toGetPaymentInfoResponse = (
  paymentInfo: PaymentInfo,
): GetPaymentInfoResponse => paymentInfo;
