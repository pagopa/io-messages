import { GenericError, NotFoundError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";

import { MalformedEntityError } from "./error.js";
import { RCConfiguration, RcConfigurationId } from "./rc-configuration.js";

export interface RemoteContentCacheRepository {
  getCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<
    Result<RCConfiguration, GenericError | MalformedEntityError | NotFoundError>
  >;

  setCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
    rcConfiguration: RCConfiguration,
  ): Promise<Result<RCConfiguration, GenericError>>;
}
