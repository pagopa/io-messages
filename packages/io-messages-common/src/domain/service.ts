import z from "zod";

export const organizationFiscalCodeSchema = z
  .string()
  .regex(new RegExp("^[0-9]{11}$"));

export const organizationNameSchema = z.string().min(1);
