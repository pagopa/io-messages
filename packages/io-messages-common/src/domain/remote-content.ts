import { z } from "zod";

import { fiscalCodeSchema } from "./fiscal-code.js";

export const RcConfigurationIdSchema = z.ulid();
export type RcConfigurationId = z.infer<typeof RcConfigurationIdSchema>;

const rcClientCertSchema = z.object({
  clientCert: z.string().min(1),
  clientKey: z.string().min(1),
  serverCa: z.string().min(1),
});

const rcAuthenticationConfigSchema = z.object({
  cert: rcClientCertSchema.optional(),
  headerKeyName: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
});

const rcEnvironmentConfigSchema = z.object({
  baseUrl: z.string().min(1),
  detailsAuthentication: rcAuthenticationConfigSchema,
});

const rcTestEnvironmentConfigSchema = rcEnvironmentConfigSchema.extend({
  testUsers: z.array(fiscalCodeSchema),
});

export const rcConfigurationSchema = z.object({
  configurationId: RcConfigurationIdSchema,
  description: z.string().min(1),
  disableLollipopFor: z.array(fiscalCodeSchema),
  hasPrecondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  id: z.string().min(1),
  isLollipopEnabled: z.boolean(),
  name: z.string().min(1),
  prodEnvironment: rcEnvironmentConfigSchema.optional(),
  testEnvironment: rcTestEnvironmentConfigSchema.optional(),
  userId: z.string().min(1),
});

export type RCConfiguration = z.infer<typeof rcConfigurationSchema>;
