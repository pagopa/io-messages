import type {
  GenericError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";

import type {
  RCConfiguration,
  RcConfigurationId,
  RemoteContentRepository,
} from "../ports/rc-configuration.js";

export type GetRcConfiguratioUseCase = UseCase<
  {
    configurationId: RcConfigurationId;
  },
  RCConfiguration,
  GenericError | TooManyRequestsError
>;

export const makeGetRcConfigurationUseCase =
  (repository: RemoteContentRepository): GetRcConfiguratioUseCase =>
  ({ configurationId }) =>
    repository.getRemoteContentConfiguration(configurationId);
