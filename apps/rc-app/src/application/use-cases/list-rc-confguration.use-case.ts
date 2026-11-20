import type {
  GenericError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";
import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import { err, ok } from "neverthrow";

import type {
  RCConfiguration,
  RemoteContentRepository,
} from "../ports/rc-configuration.js";
import type { UserRCConfigurationRepository } from "../ports/user-rc-configuration.js";

import { RcConfigurationIdSchema } from "../ports/rc-configuration.js";

export type ListRcConfigurationUseCase = UseCase<
  {
    userId: string;
  },
  RCConfiguration[],
  GenericError | TooManyRequestsError
>;

export const makeListRcConfigurationUseCase =
  (
    userRCConfigurationRepository: UserRCConfigurationRepository,
    remoteContentRepository: RemoteContentRepository,
    logger?: Pick<Logger, "trackEvent">,
  ): ListRcConfigurationUseCase =>
  async ({ userId }) => {
    const userConfigurations =
      await userRCConfigurationRepository.listUserRCConfigurations(userId);
    if (userConfigurations.isErr()) {
      return err(userConfigurations.error);
    }

    const configurationIds = userConfigurations.value.flatMap(
      (configuration) => {
        const decoded = RcConfigurationIdSchema.safeParse(configuration.id);
        return decoded.success ? [decoded.data] : [];
      },
    );
    const discardedCount =
      userConfigurations.value.length - configurationIds.length;
    if (discardedCount > 0) {
      logger?.trackEvent({
        name: "ListRcConfigurationUseCase.discardedInvalidConfigurationIds",
        properties: { discardedCount },
      });
    }

    const configurations =
      await remoteContentRepository.listRemoteContentConfigurations(
        configurationIds,
      );
    if (configurations.isErr()) {
      return err(configurations.error);
    }

    return ok(
      configurations.value.map((configuration) => ({
        ...configuration,
        userId,
      })),
    );
  };
