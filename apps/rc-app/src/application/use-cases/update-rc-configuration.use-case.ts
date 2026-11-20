import type {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";

import { ForbiddenError } from "@pagopa/hexagonal-core";
import { err } from "neverthrow";

import type {
  RCConfiguration,
  RcConfigurationId,
  RemoteContentRepository,
} from "../ports/rc-configuration.js";

export type UpdateRcConfigurationUseCase = UseCase<
  {
    configuration: Omit<RCConfiguration, "configurationId" | "id" | "userId">;
    configurationId: RcConfigurationId;
    isInternalUser: boolean;
    userId: string;
  },
  RCConfiguration,
  ForbiddenError | GenericError | NotFoundError | TooManyRequestsError
>;

export const makeUpdateRcConfigurationUseCase =
  (repository: RemoteContentRepository): UpdateRcConfigurationUseCase =>
  async ({ configuration, configurationId, isInternalUser, userId }) => {
    const existing =
      await repository.getRemoteContentConfiguration(configurationId);
    if (existing.isErr()) {
      return err(existing.error);
    }

    if (!isInternalUser && existing.value.userId !== userId) {
      return err(new ForbiddenError());
    }

    return repository.updateRemoteContentConfiguration({
      ...configuration,
      configurationId,
      id: configurationId,
      userId: existing.value.userId,
    });
  };
