import { GenericError, NotFoundError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";

import { MalformedEntityError } from "./error.js";
import { RCConfiguration, RcConfigurationId } from "./rc-configuration.js";

export interface RemoteContentCacheRepository {
  /**
   * Returns the cached RC configuration for the given configuration ID.
   *
   * Returns a `NotFoundError` if no entry exists in the cache, a
   * `MalformedEntityError` if the cached value cannot be parsed or fails
   * schema validation, or a `GenericError` on infrastructure failures.
   */
  getCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<
    Result<RCConfiguration, GenericError | MalformedEntityError | NotFoundError>
  >;

  /**
   * Stores the RC configuration for the given configuration ID in the cache.
   * If `ttlInSeconds` is provided, the entry expires after that duration otherwise it
   * is stored indefinitely.
   */
  setCachedRemoteContentConfiguration(
    configurationId: RcConfigurationId,
    rcConfiguration: RCConfiguration,
    ttlInSeconds?: number,
  ): Promise<Result<RCConfiguration, GenericError>>;
}
