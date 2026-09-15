import z from "zod";

export const paymentAmountSchema = z.number().int().min(0).max(9999999999);

export const noticeNumberSchema = z
  .string()
  .regex(new RegExp("^[0123][0-9]{17}$"));

export const payeeSchema = z.object({
  fiscal_code: z.string().regex(new RegExp("^[0-9]{11}$")),
});
