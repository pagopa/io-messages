import { fiscalCodeSchema } from "@/domain/fiscal-code.js";
import { z } from "zod";

const rcClientCertSchema = z.object({
  client_cert: z.string().min(1),
  client_key: z.string().min(1),
  server_ca: z.string().min(1),
});

const rcAuthenticationConfigSchema = z.object({
  cert: rcClientCertSchema.optional(),
  header_key_name: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
});

const rcEnvironmentConfigSchema = z.object({
  base_url: z.string().min(1),
  details_authentication: rcAuthenticationConfigSchema,
});

const rcTestEnvironmentConfigSchema = rcEnvironmentConfigSchema.extend({
  test_users: z.array(fiscalCodeSchema),
});

export const rcConfigurationResponseSchema = z.object({
  configuration_id: z.ulid(),
  description: z.string().min(1),
  disable_lollipop_for: z.array(fiscalCodeSchema),
  has_precondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  is_lollipop_enabled: z.boolean(),
  name: z.string().min(1),
  prod_environment: rcEnvironmentConfigSchema.optional(),
  test_environment: rcTestEnvironmentConfigSchema.optional(),
  user_id: z.string().min(1),
});

export type RCConfigurationResponse = z.infer<
  typeof rcConfigurationResponseSchema
>;
