import type {
  RCConfiguration,
  RcConfigurationId,
} from "io-messages-common/domain/remote-content";

import {
  ConflictError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";

export {
  type RCConfiguration,
  type RcConfigurationId,
  RcConfigurationIdSchema,
  rcConfigurationSchema,
} from "io-messages-common/domain/remote-content";

export interface RemoteContentRepository {
  /**
   * Create a new RC configuration in the repository.
   */
  createRemoteContentConfiguration(
    configuration: RCConfiguration,
  ): Promise<
    Result<RCConfiguration, ConflictError | GenericError | TooManyRequestsError>
  >;

  /**
   * Returns the RC configuration identified by the given configuration ID.
   *
   * Returns a `NotFoundError` if no matching configuration exists, a
   * `TooManyRequestsError` if the upstream store is rate-limiting requests,
   * or a `GenericError` on other infrastructure failures.
   */
  getRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<
    Result<RCConfiguration, GenericError | NotFoundError | TooManyRequestsError>
  >;

  /**
   * Lists all RC configurations in the repository.
   *
   * Returns a `TooManyRequestsError` if the upstream store is rate-limiting requests,
   * or a `GenericError` on other infrastructure failures.
   */
  listRemoteContentConfigurations(
    configurationIds: RcConfigurationId[],
  ): Promise<Result<RCConfiguration[], GenericError | TooManyRequestsError>>;

  /**
   * Updates an existing RC configuration, replacing it with the given one.
   *
   * Returns a `NotFoundError` if no configuration exists for the given
   * `configurationId`, a `TooManyRequestsError` if the upstream store is
   * rate-limiting requests, or a `GenericError` on other infrastructure
   * failures.
   */
  updateRemoteContentConfiguration(
    configuration: RCConfiguration,
  ): Promise<
    Result<RCConfiguration, GenericError | NotFoundError | TooManyRequestsError>
  >;
}
