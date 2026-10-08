import type { FiscalCode } from "@pagopa/hexagonal-core";

import { fiscalCodeSchema } from "@/domain/fiscal-code.js";
import { z } from "zod";

const RcAuthenticationConfigDtoSchema = z.object({
  header_key_name: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
});

const RcEnvironmentConfigDtoSchema = z.object({
  base_url: z.string().min(1),
  details_authentication: RcAuthenticationConfigDtoSchema,
});

const RcTestEnvironmentConfigDtoSchema = RcEnvironmentConfigDtoSchema.extend({
  test_users: z.array(fiscalCodeSchema),
});

interface RcEnvironmentResponse {
  base_url: string;
  details_authentication: {
    header_key_name: string;
    key: string;
    type: string;
  };
}

export interface RcConfigurationResponse {
  configuration_id: string;
  description: string;
  disable_lollipop_for: FiscalCode[];
  has_precondition: "ALWAYS" | "NEVER" | "ONCE";
  is_lollipop_enabled: boolean;
  name: string;
  prod_environment?: RcEnvironmentResponse;
  test_environment?: { test_users: FiscalCode[] } & RcEnvironmentResponse;
  user_id: string;
}

export const RcConfigurationResponseSchema: z.ZodType<RcConfigurationResponse> =
  z.object({
    configuration_id: z.ulid(),
    description: z.string().min(1),
    disable_lollipop_for: z.array(fiscalCodeSchema),
    has_precondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
    is_lollipop_enabled: z.boolean(),
    name: z.string().min(1),
    prod_environment: RcEnvironmentConfigDtoSchema.optional(),
    test_environment: RcTestEnvironmentConfigDtoSchema.optional(),
    user_id: z.string().min(1),
  });
