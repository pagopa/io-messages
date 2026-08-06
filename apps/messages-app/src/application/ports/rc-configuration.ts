import type { RCConfiguration } from "io-messages-common/domain/remote-content";

import {
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

export interface RCConfigurationRepository {
  /**
   * Retrieves the remote content configuration identified by the given id.
   */
  getRemoteContentConfiguration(
    id: string,
  ): Promise<
    Result<RCConfiguration, GenericError | NotFoundError | TooManyRequestsError>
  >;
}
