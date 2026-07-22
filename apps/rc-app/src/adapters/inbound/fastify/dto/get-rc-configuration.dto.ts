import { FiscalCodeSchema } from "@pagopa/hexagonal-core";
import z from "zod";

import { RCConfiguration } from "../../../../application/ports/rc-configuration.js";

const RcClientCertDtoSchema = z.object({
  clientCert: z.string(),
  clientKey: z.string(),
  serverCa: z.string(),
});

const RcAuthenticationConfigDtoSchema = z.object({
  cert: RcClientCertDtoSchema.optional(),
  headerKeyName: z.string(),
  key: z.string(),
  type: z.string(),
});

const RcEnvironmentConfigDtoSchema = z.object({
  baseUrl: z.string(),
  detailsAuthentication: RcAuthenticationConfigDtoSchema,
});

const RcTestEnvironmentConfigDtoSchema = RcEnvironmentConfigDtoSchema.extend({
  testUsers: z.array(FiscalCodeSchema),
});

export const RcConfigurationResponseSchema = z.object({
  configurationId: z.string(),
  description: z.string(),
  disableLollipopFor: z.array(z.string()),
  hasPrecondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  id: z.string(),
  isLollipopEnabled: z.boolean(),
  name: z.string(),
  prodEnvironment: RcEnvironmentConfigDtoSchema.optional(),
  testEnvironment: RcTestEnvironmentConfigDtoSchema.optional(),
  userId: z.string(),
});

export const toRcConfigurationResponse = (
  rc: RCConfiguration,
): z.TypeOf<typeof RcConfigurationResponseSchema> => rc;
