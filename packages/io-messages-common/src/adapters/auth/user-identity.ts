import type { FiscalCode } from "@pagopa/hexagonal-core";

import { fiscalCodeSchema } from "@/domain/fiscal-code.js";
import { z } from "zod";

import { assertionRefSchema } from "../lollipop/definitions/assertion-ref.js";
import { spidLevelSchema } from "./spid-level.js";

export interface UserIdentity {
  assertion_ref?: z.infer<typeof assertionRefSchema>;
  date_of_birth: string;
  family_name: string;
  fiscal_code: FiscalCode;
  name: string;
  session_tracking_id?: string;
  spid_email?: string;
  spid_idp?: string;
  spid_level: z.infer<typeof spidLevelSchema>;
}

export const userIdentitySchema: z.ZodType<UserIdentity> = z.object({
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
