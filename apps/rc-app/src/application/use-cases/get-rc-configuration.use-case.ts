import type {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";

import type {
  RCConfiguration,
  RcConfigurationId,
  RemoteContentRepository,
} from "../ports/rc-configuration.js";

export type GetRcConfigurationUseCase = UseCase<
  {
    configurationId: RcConfigurationId;
  },
  RCConfiguration,
  GenericError | NotFoundError | TooManyRequestsError
>;

export const makeGetRcConfigurationUseCase =
  (repository: RemoteContentRepository): GetRcConfigurationUseCase =>
  async ({ configurationId }) =>
    repository.getRemoteContentConfiguration(configurationId);
