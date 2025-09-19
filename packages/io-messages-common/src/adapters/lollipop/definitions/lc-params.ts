import { z } from "zod";

import { fiscalCodeSchema } from "../../../domain/fiscal-code.js";
import { assertionRefSchema } from "./assertion-ref.js";
import { assertionTypeSchema } from "./assertion-type.js";
import { pubKeyStatusSchema } from "./pub-key-status.js";

const assertionFileNameSchema = z
  .string()
  .regex(
    /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]-(sha256-[A-Za-z0-9-_=]{1,44}|sha384-[A-Za-z0-9-_=]{1,66}|sha512-[A-Za-z0-9-_=]{1,88})$/,
  );

export const lcParamsSchema = z.object({
  assertion_file_name: assertionFileNameSchema,
  assertion_ref: assertionRefSchema,
  assertion_type: assertionTypeSchema,
  expired_at: z.coerce.date(),
  fiscal_code: fiscalCodeSchema,
  lc_authentication_bearer: z.string().min(1),
  pub_key: z.string().min(1),
  status: pubKeyStatusSchema,
  ttl: z.number().int(),
  version: z.number().int(),
});

export type LcParams = z.infer<typeof lcParamsSchema>;
