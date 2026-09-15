import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { z } from "zod";

import type { RCConfiguration } from "../../../../application/ports/rc-configuration.js";

const RcClientCertRequestSchema = z.object({
  client_cert: z.string().min(1),
  client_key: z.string().min(1),
  server_ca: z.string().min(1),
});

const RcAuthenticationConfigRequestSchema = z.object({
  cert: RcClientCertRequestSchema.optional(),
  header_key_name: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
});

const RcEnvironmentConfigRequestSchema = z.object({
  base_url: z.string().min(1),
  details_authentication: RcAuthenticationConfigRequestSchema,
});

const RcTestEnvironmentConfigRequestSchema =
  RcEnvironmentConfigRequestSchema.extend({
    test_users: z.array(fiscalCodeSchema),
  });

export const CreateRcConfigurationRequestSchema = z.object({
  description: z.string().min(1),
  disable_lollipop_for: z.array(fiscalCodeSchema),
  has_precondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  is_lollipop_enabled: z.boolean(),
  name: z.string().min(1),
  prod_environment: RcEnvironmentConfigRequestSchema.optional(),
  test_environment: RcTestEnvironmentConfigRequestSchema.optional(),
});

export type CreateRcConfigurationRequest = z.infer<
  typeof CreateRcConfigurationRequestSchema
>;

const toRcEnvironment = (
  environment: NonNullable<CreateRcConfigurationRequest["prod_environment"]>,
): NonNullable<RCConfiguration["prodEnvironment"]> => ({
  baseUrl: environment.base_url,
  detailsAuthentication: {
    cert: environment.details_authentication.cert
      ? {
          clientCert: environment.details_authentication.cert.client_cert,
          clientKey: environment.details_authentication.cert.client_key,
          serverCa: environment.details_authentication.cert.server_ca,
        }
      : undefined,
    headerKeyName: environment.details_authentication.header_key_name,
    key: environment.details_authentication.key,
    type: environment.details_authentication.type,
  },
});

export const toRcConfigurationCreate = (
  request: CreateRcConfigurationRequest,
): Omit<RCConfiguration, "configurationId" | "id" | "userId"> => ({
  description: request.description,
  disableLollipopFor: request.disable_lollipop_for,
  hasPrecondition: request.has_precondition,
  isLollipopEnabled: request.is_lollipop_enabled,
  name: request.name,
  prodEnvironment: request.prod_environment
    ? toRcEnvironment(request.prod_environment)
    : undefined,
  testEnvironment: request.test_environment
    ? {
        ...toRcEnvironment(request.test_environment),
        testUsers: request.test_environment.test_users,
      }
    : undefined,
});
