import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";

import type {
  RCConfiguration,
  RcConfigurationId,
} from "../ports/rc-configuration.js";
import type { GetRcConfigurationUseCase } from "./get-rc-configuration.use-case.js";

interface GetPublicRcConfigurationInput {
  configurationId: RcConfigurationId;
  isInternalUser: boolean;
  userId: string;
}

export type GetPublicRcConfigurationUseCase = UseCase<
  GetPublicRcConfigurationInput,
  RCConfiguration,
  ForbiddenError | GenericError | NotFoundError
>;

export const makeGetPublicRcConfigurationUseCase =
  (
    getRcConfigurationUseCase: GetRcConfigurationUseCase,
  ): GetPublicRcConfigurationUseCase =>
  async ({ configurationId, isInternalUser, userId }) => {
    const configurationResult = await getRcConfigurationUseCase({
      configurationId,
    });
    if (configurationResult.isErr()) {
      if (configurationResult.error instanceof TooManyRequestsError) {
        return err(new GenericError(configurationResult.error.message));
      }

      return err(configurationResult.error);
    }

    if (!isInternalUser && configurationResult.value.userId !== userId) {
      return err(new ForbiddenError());
    }

    return ok(configurationResult.value);
  };
