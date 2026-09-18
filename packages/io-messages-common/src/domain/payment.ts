import z from "zod";

import { rptIdSchema } from "./message.js";

export const paymentAmountSchema = z.number().int().min(0).max(9999999999);

export const noticeNumberSchema = z
  .string()
  .regex(new RegExp("^[0123][0-9]{17}$"));

export const payeeSchema = z.object({
  fiscal_code: z.string().regex(new RegExp("^[0-9]{11}$")),
});

export const paymentInfoSchema = z.object({
  amount: z.number().int().min(0).max(99_999_999),
  description: z.string().min(1).max(140),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paFiscalCode: z.string().regex(/^\d{11}$/),
  paName: z.string().min(1).max(140),
  rptId: rptIdSchema.optional(),
});

export type PaymentInfo = z.TypeOf<typeof paymentInfoSchema>;
