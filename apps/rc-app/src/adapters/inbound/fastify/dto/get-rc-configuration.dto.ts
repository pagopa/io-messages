import {
  type RcConfigurationResponse,
  RcConfigurationResponseSchema,
} from "io-messages-common/adapters/remote-content";

import { RCConfiguration } from "../../../../application/ports/rc-configuration.js";

export { RcConfigurationResponseSchema };

const toRcEnvironmentResponse = (
  environment: NonNullable<RCConfiguration["prodEnvironment"]>,
) => ({
  base_url: environment.baseUrl,
  details_authentication: {
    header_key_name: environment.detailsAuthentication.headerKeyName,
    key: environment.detailsAuthentication.key,
    type: environment.detailsAuthentication.type,
  },
});

export const toRcConfigurationResponse = (
  rc: RCConfiguration,
): RcConfigurationResponse => ({
  configuration_id: rc.configurationId,
  description: rc.description,
  disable_lollipop_for: rc.disableLollipopFor,
  has_precondition: rc.hasPrecondition,
  is_lollipop_enabled: rc.isLollipopEnabled,
  name: rc.name,
  prod_environment: rc.prodEnvironment
    ? toRcEnvironmentResponse(rc.prodEnvironment)
    : undefined,
  test_environment: rc.testEnvironment
    ? {
        ...toRcEnvironmentResponse(rc.testEnvironment),
        test_users: rc.testEnvironment.testUsers,
      }
    : undefined,
  user_id: rc.userId,
});
