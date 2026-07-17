import {
  FiscalCodeSchema,
  GenericError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";
import z from "zod";

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
  testUsers: z.array(FiscalCodeSchema).readonly(),
});

export const rcConfigurationSchema = z.object({
  configurationId: RcConfigurationIdSchema,
  description: z.string().min(1),
  disableLollipopFor: z.array(FiscalCodeSchema).readonly(),
  hasPrecondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  id: z.string().min(1),
  isLollipopEnabled: z.boolean(),
  name: z.string().min(1),
  prodEnvironment: rcEnvironmentConfigSchema.optional(),
  testEnvironment: rcTestEnvironmentConfigSchema.optional(),
  userId: z.string().min(1),
});
export type RCConfiguration = z.TypeOf<typeof rcConfigurationSchema>;

export interface RemoteContentRepository {
  getRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<Result<RCConfiguration, GenericError | TooManyRequestsError>>;
}
