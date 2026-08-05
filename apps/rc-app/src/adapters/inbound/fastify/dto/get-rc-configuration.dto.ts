import {
  RCConfigurationResponse,
  rcConfigurationResponseSchema,
} from "io-messages-common/adapters/outbound/remote-content";

import { RCConfiguration } from "../../../../application/ports/rc-configuration.js";

export const RcConfigurationResponseSchema = rcConfigurationResponseSchema;

const toRcEnvironmentResponse = (
  environment: NonNullable<RCConfiguration["prodEnvironment"]>,
): NonNullable<RCConfigurationResponse["prod_environment"]> => ({
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
): RCConfigurationResponse => ({
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
