import { RCConfigurationModel } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import { retrievedRCConfigurationToPublic } from "@pagopa/io-functions-commons/dist/src/utils/rc_configuration";
import {
  withRequestMiddlewares,
  wrapRequestHandler,
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseSuccessRedirectToResource,
  ResponseSuccessRedirectToResource,
} from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";

import { NewRCConfigurationPublic } from "../generated/definitions/NewRCConfigurationPublic";
import { RCConfigurationPublic } from "../generated/definitions/RCConfigurationPublic";
import {
  RequiredSubscriptionIdMiddleware,
  RequiredUserGroupsMiddleware,
  RequiredUserIdMiddleware,
} from "../middlewares/required_headers_middleware";
import { makeNewRCConfigurationWithConfigurationId } from "../utils/mappers";
import { checkGroupAndManageSubscription } from "../utils/remote_content";
import { handleCosmosErrorResponse } from "../utils/response";

interface IHandlerParameter {
  readonly newRCConfiguration: NewRCConfigurationPublic;
  readonly subscriptionId: NonEmptyString;
  readonly userGroups: NonEmptyString;
  readonly userId: NonEmptyString;
}

interface ICreateRCConfigurationHandlerParameter {
  readonly generateConfigurationId: () => Ulid;
  readonly rccModel: RCConfigurationModel;
}

type CreateRCConfigurationHandlerReturnType = (
  parameter: IHandlerParameter,
) => Promise<
  // eslint-disable-next-line @typescript-eslint/ban-types
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
  | IResponseSuccessRedirectToResource<
      RCConfigurationPublic,
      RCConfigurationPublic
    >
>;

type CreateRCConfigurationHandler = (
  parameter: ICreateRCConfigurationHandlerParameter,
) => CreateRCConfigurationHandlerReturnType;

export const createRCConfigurationHandler: CreateRCConfigurationHandler =
  ({
    generateConfigurationId,
    rccModel,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  }) =>
  ({ newRCConfiguration, subscriptionId, userGroups, userId }) =>
    pipe(
      checkGroupAndManageSubscription(subscriptionId, userGroups),
      TE.chainW(() =>
        pipe(
          rccModel.create(
            makeNewRCConfigurationWithConfigurationId(
              generateConfigurationId,
              userId,
              newRCConfiguration,
            ),
          ),
          TE.mapLeft(
            handleCosmosErrorResponse(
              "Something went wrong trying to create the configuration",
            ),
          ),
        ),
      ),
      TE.map(
        flow(retrievedRCConfigurationToPublic, (publicConfiguration) =>
          ResponseSuccessRedirectToResource(
            publicConfiguration,
            `/api/v1/remote-contents/configurations/`,
            publicConfiguration,
          ),
        ),
      ),
      TE.toUnion,
    )();

interface IGetCreateRCConfigurationHandlerParameter {
  readonly generateConfigurationId: () => Ulid;
  readonly rccModel: RCConfigurationModel;
}

type GetCreateRCConfigurationHandlerReturnType = express.RequestHandler;

type GetCreateRCConfigurationHandler = (
  parameter: IGetCreateRCConfigurationHandlerParameter,
) => GetCreateRCConfigurationHandlerReturnType;

export const getCreateRCConfigurationExpressHandler: GetCreateRCConfigurationHandler =
  ({ generateConfigurationId, rccModel }) => {
    const handler = createRCConfigurationHandler({
      generateConfigurationId,
      rccModel,
    });

    const middlewaresWrap = withRequestMiddlewares(
      ContextMiddleware(),
      RequiredSubscriptionIdMiddleware(),
      RequiredUserGroupsMiddleware(),
      RequiredUserIdMiddleware(),
      RequiredBodyPayloadMiddleware(NewRCConfigurationPublic),
    );

    return wrapRequestHandler(
      middlewaresWrap(
        (_, subscriptionId, userGroups, userId, newRCConfiguration) =>
          handler({ newRCConfiguration, subscriptionId, userGroups, userId }),
      ),
    );
  };
