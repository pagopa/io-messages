import { fiscalCodeSchema } from "@/domain/fiscal-code.js";
import { z } from "zod";

import { assertionRefSchema } from "../lollipop/definitions/assertion-ref.js";
import { spidLevelSchema } from "./spid-level.js";

export const userIdentitySchema = z.object({
  assertion_ref: assertionRefSchema.optional(),
  date_of_birth: z.string(),
  family_name: z.string(),
  fiscal_code: fiscalCodeSchema,
  name: z.string(),
  session_tracking_id: z.string().optional(),
  spid_email: z.string().email().optional(),
  spid_idp: z.string().optional(),
  spid_level: spidLevelSchema,
});

export type UserIdentity = z.infer<typeof userIdentitySchema>;
