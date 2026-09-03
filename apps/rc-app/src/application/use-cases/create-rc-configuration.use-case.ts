import type {
  ConflictError,
  GenericError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";

import type {
  RCConfiguration,
  RcConfigurationId,
  RemoteContentRepository,
} from "../ports/rc-configuration.js";

export type CreateRcConfigurationUseCase = UseCase<
  {
    configuration: Omit<RCConfiguration, "configurationId" | "id" | "userId">;
    userId: string;
  },
  RCConfiguration,
  ConflictError | GenericError | TooManyRequestsError
>;

export const makeCreateRcConfigurationUseCase =
  (
    repository: RemoteContentRepository,
    generateConfigurationId: () => RcConfigurationId,
  ): CreateRcConfigurationUseCase =>
  async ({ configuration, userId }) => {
    const configurationId = generateConfigurationId();

    return repository.createRemoteContentConfiguration({
      ...configuration,
      configurationId,
      id: configurationId,
      userId,
    });
  };
