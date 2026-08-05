import { FiscalCodeSchema } from "@pagopa/hexagonal-core";
import z from "zod";

import { RCConfiguration } from "../../../../application/ports/rc-configuration.js";

const RcClientCertDtoSchema = z.object({
  client_cert: z.string().min(1),
  client_key: z.string().min(1),
  server_ca: z.string().min(1),
});

const RcAuthenticationConfigDtoSchema = z.object({
  cert: RcClientCertDtoSchema.optional(),
  header_key_name: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
});

const RcEnvironmentConfigDtoSchema = z.object({
  base_url: z.string().min(1),
  details_authentication: RcAuthenticationConfigDtoSchema,
});

const RcTestEnvironmentConfigDtoSchema = RcEnvironmentConfigDtoSchema.extend({
  test_users: z.array(FiscalCodeSchema),
});

export const RcConfigurationResponseSchema = z.object({
  configuration_id: z.ulid(),
  description: z.string().min(1),
  disable_lollipop_for: z.array(FiscalCodeSchema),
  has_precondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  is_lollipop_enabled: z.boolean(),
  name: z.string().min(1),
  prod_environment: RcEnvironmentConfigDtoSchema.optional(),
  test_environment: RcTestEnvironmentConfigDtoSchema.optional(),
  user_id: z.string().min(1),
});

const toRcEnvironmentResponse = (
  environment: NonNullable<RCConfiguration["prodEnvironment"]>,
): z.TypeOf<typeof RcEnvironmentConfigDtoSchema> => ({
  base_url: environment.baseUrl,
  details_authentication: {
    cert:
      environment.detailsAuthentication.cert === undefined
        ? undefined
        : {
            client_cert: environment.detailsAuthentication.cert.clientCert,
            client_key: environment.detailsAuthentication.cert.clientKey,
            server_ca: environment.detailsAuthentication.cert.serverCa,
          },
    header_key_name: environment.detailsAuthentication.headerKeyName,
    key: environment.detailsAuthentication.key,
    type: environment.detailsAuthentication.type,
  },
});

export const toRcConfigurationResponse = (
  configuration: RCConfiguration,
): z.TypeOf<typeof RcConfigurationResponseSchema> => ({
  configuration_id: configuration.configurationId,
  description: configuration.description,
  disable_lollipop_for: configuration.disableLollipopFor,
  has_precondition: configuration.hasPrecondition,
  is_lollipop_enabled: configuration.isLollipopEnabled,
  name: configuration.name,
  prod_environment:
    configuration.prodEnvironment === undefined
      ? undefined
      : toRcEnvironmentResponse(configuration.prodEnvironment),
  test_environment:
    configuration.testEnvironment === undefined
      ? undefined
      : {
          ...toRcEnvironmentResponse(configuration.testEnvironment),
          test_users: configuration.testEnvironment.testUsers,
        },
  user_id: configuration.userId,
});
