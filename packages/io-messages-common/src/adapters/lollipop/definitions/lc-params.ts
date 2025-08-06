import { z } from "zod";

import { fiscalCodeSchema } from "../../../domain/fiscal-code.js";
import { AssertionType } from "./assertion-type.js";

const assertionFileNameSchema = z
  .string()
  .regex(
    /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]-(sha256-[A-Za-z0-9-_=]{1,44}|sha384-[A-Za-z0-9-_=]{1,66}|sha512-[A-Za-z0-9-_=]{1,88})$/,
  );

export const lcParamsSchema = z.object({
  assertion_file_name: assertionFileNameSchema,
  assertion_type: AssertionType,
  expired_at: z.coerce.date(),
  fiscal_code: fiscalCodeSchema,
  lc_authentication_bearer: z.string().min(1),
});

export type LcParams = z.TypeOf<typeof lcParamsSchema>;
