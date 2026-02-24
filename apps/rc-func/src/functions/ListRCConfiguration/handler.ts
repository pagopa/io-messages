import { RCConfigurationModel } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { UserRCConfigurationModel } from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { wrapHandlerV4 } from "@pagopa/io-functions-commons/dist/src/utils/azure-functions-v4-express-adapter";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { retrievedRCConfigurationToPublic } from "@pagopa/io-functions-commons/dist/src/utils/rc_configuration";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";

import { RCConfigurationListResponse } from "../../generated/definitions/RCConfigurationListResponse";
import {
  RequiredSubscriptionIdMiddleware,
  RequiredUserGroupsMiddleware,
  RequiredUserIdMiddleware,
} from "../../middlewares/required_headers_middleware";
import { checkGroupAndManageSubscription } from "../../utils/remote_content";
import { handleCosmosErrorResponse } from "../../utils/response";

interface IHandlerParameter {
  readonly subscriptionId: NonEmptyString;
  readonly userGroups: NonEmptyString;
  readonly userId: NonEmptyString;
}

interface IListRCConfigurationHandlerParameter {
  readonly rcConfigurationModel: RCConfigurationModel;
  readonly userRCConfigurationModel: UserRCConfigurationModel;
}

export const listRCConfigurationHandler =
  ({
    rcConfigurationModel,
    userRCConfigurationModel,
  }: IListRCConfigurationHandlerParameter) =>
  ({
    subscriptionId,
    userGroups,
    userId,
  }: IHandlerParameter): Promise<
    | IResponseErrorForbiddenNotAuthorized
    | IResponseErrorInternal
    | IResponseSuccessJson<RCConfigurationListResponse>
  > =>
    pipe(
      checkGroupAndManageSubscription(subscriptionId, userGroups),
      TE.chainW(() =>
        pipe(
          userRCConfigurationModel.findAllByUserId(userId),
          TE.mapLeft(
            handleCosmosErrorResponse(
              "Something went wrong trying to retrieve the user's configurations",
            ),
          ),
        ),
      ),
      TE.chainW((configList) =>
        pipe(
          configList,
          RA.map((configuration) => Ulid.decode(configuration.id)),
          RA.rights,
          (configIdList) =>
            rcConfigurationModel.findAllByConfigurationId(configIdList),
          TE.mapLeft(
            handleCosmosErrorResponse(
              "Something went wrong trying to retrieve the configurations by id",
            ),
          ),
        ),
      ),
      TE.map((retrievedConfigurations) =>
        pipe(
          retrievedConfigurations,
          RA.map(
            flow(retrievedRCConfigurationToPublic, (publicConfig) => ({
              ...publicConfig,
              user_id: userId,
            })),
          ),
          (rcConfigList) => ResponseSuccessJson({ rcConfigList }),
        ),
      ),
      TE.toUnion,
    )();

export const getListRCConfigurationHandler = ({
  rcConfigurationModel,
  userRCConfigurationModel,
}: IListRCConfigurationHandlerParameter) => {
  const handler = listRCConfigurationHandler({
    rcConfigurationModel,
    userRCConfigurationModel,
  });

  const middlewares = [
    ContextMiddleware(),
    RequiredSubscriptionIdMiddleware(),
    RequiredUserGroupsMiddleware(),
    RequiredUserIdMiddleware(),
  ] as const;

  return wrapHandlerV4(middlewares, (_, subscriptionId, userGroups, userId) =>
    handler({ subscriptionId, userGroups, userId }),
  );
};
