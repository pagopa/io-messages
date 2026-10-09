import { type FiscalCode, FiscalCodeSchema } from "@pagopa/hexagonal-core";
import { z } from "zod";

export const fiscalCodeSchema: z.ZodType<FiscalCode> = z.custom<FiscalCode>(
  (value) => FiscalCodeSchema.safeParse(value).success,
);

export type { FiscalCode };
