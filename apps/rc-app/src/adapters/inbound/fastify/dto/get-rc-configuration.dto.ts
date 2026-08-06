import {
  type RcConfigurationResponse,
  RcConfigurationResponseSchema,
} from "io-messages-common/adapters/remote-content";

import { RCConfiguration } from "../../../../application/ports/rc-configuration.js";

export { RcConfigurationResponseSchema };

export const toRcConfigurationResponse = (
  rc: RCConfiguration,
): RcConfigurationResponse => rc;
