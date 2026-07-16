import { GenericError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";

import { RCConfiguration, RcConfigurationId } from "./rc-configuration.js";

export interface RemoteContentCacheRepository {
  getCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<Result<RCConfiguration, GenericError>>;

  setCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
    rcConfiguration: RCConfiguration,
  ): Promise<Result<RCConfiguration, GenericError>>;
}
