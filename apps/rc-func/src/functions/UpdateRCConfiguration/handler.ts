import {
  RCConfiguration,
  RCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler,
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessNoContent,
  ResponseErrorForbiddenNotAuthorized,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseSuccessNoContent,
} from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as express from "express";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { NewRCConfigurationPublic } from "../../generated/definitions/NewRCConfigurationPublic";
import {
  RequiredSubscriptionIdMiddleware,
  RequiredUserGroupsMiddleware,
  RequiredUserIdMiddleware,
} from "../../middlewares/required_headers_middleware";
import { IConfig } from "../../utils/config";
import { makeNewRCConfigurationWithConfigurationId } from "../../utils/mappers";
import { RedisClientFactory } from "../../utils/redis";
import { setWithExpirationTask } from "../../utils/redis_storage";
import { checkGroupAndManageSubscription } from "../../utils/remote_content";
import { RC_CONFIGURATION_REDIS_PREFIX } from "../GetRCConfiguration/handler";

export const eventName = "remote.content.configuration.updated";

export const isUserAllowedToUpdateConfiguration = (
  userId: NonEmptyString,
): ((
  configuration: RCConfiguration,
) => TE.TaskEither<IResponseErrorForbiddenNotAuthorized, RCConfiguration>) =>
  TE.fromPredicate(
    (configuration) => configuration.userId === userId,
    () => ResponseErrorForbiddenNotAuthorized,
  );

interface IHandleUpsertParameter {
  readonly config: IConfig;
  readonly rccModel: RCConfigurationModel;
  readonly redisClientFactory: RedisClientFactory;
  readonly telemetryClient?: TelemetryClient;
}

export const handleUpsert =
  ({
    config,
    rccModel,
    redisClientFactory,
    telemetryClient,
  }: IHandleUpsertParameter) =>
  (
    newRCConfiguration: RCConfiguration,
  ): TE.TaskEither<IResponseErrorInternal, IResponseSuccessNoContent> =>
    pipe(
      rccModel.upsert(newRCConfiguration),
      TE.mapLeft((e) =>
        ResponseErrorInternal(
          `Something went wrong trying to upsert the configuration: ${e}`,
        ),
      ),
      TE.chainFirstW((rcConfiguration) =>
        pipe(
          setWithExpirationTask(
            redisClientFactory,
            `${RC_CONFIGURATION_REDIS_PREFIX}-${rcConfiguration.configurationId}`,
            JSON.stringify(rcConfiguration),
            config.RC_CONFIGURATION_CACHE_TTL,
          ),
          TE.orElseW(() => TE.of(rcConfiguration)),
        ),
      ),
      TE.map((rcConfiguration) =>
        pipe(
          telemetryClient?.trackEvent({
            name: eventName,
            properties: {
              configurationId: rcConfiguration.configurationId,
              configurationName: rcConfiguration.name,
              userId: rcConfiguration.userId,
            },
            tagOverrides: { samplingEnabled: "false" },
          }),
          ResponseSuccessNoContent,
        ),
      ),
    );

export const handleEmptyConfiguration = (
  maybeConfiguration: O.Option<RCConfiguration>,
): TE.TaskEither<IResponseErrorNotFound, RCConfiguration> =>
  pipe(
    maybeConfiguration,
    TE.fromOption(() =>
      ResponseErrorNotFound(
        `Configuration not found`,
        `Cannot find any remote-content configuration`,
      ),
    ),
  );

export const handleGetRCConfiguration = (
  rccModel: RCConfigurationModel,
  configurationId: Ulid,
): TE.TaskEither<IResponseErrorInternal, O.Option<RCConfiguration>> =>
  pipe(
    rccModel.findByConfigurationId(configurationId),
    TE.mapLeft((e) =>
      ResponseErrorInternal(
        `Something went wrong trying to retrieve the configuration: ${e}`,
      ),
    ),
  );

interface IHandlerParameter {
  readonly configurationId: Ulid;
  readonly newRCConfiguration: NewRCConfigurationPublic;
  readonly subscriptionId: NonEmptyString;
  readonly userGroups: NonEmptyString;
  readonly userId: NonEmptyString;
}

interface IUpdateRCConfigurationHandlerParameter {
  readonly config: IConfig;
  readonly rccModel: RCConfigurationModel;
  readonly redisClientFactory: RedisClientFactory;
  readonly telemetryClient?: TelemetryClient;
}

type UpdateRCConfigurationHandlerReturnType = (
  parameter: IHandlerParameter,
) => Promise<
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
  | IResponseErrorNotFound
  | IResponseSuccessNoContent
>;

type UpdateRCConfigurationHandler = (
  parameter: IUpdateRCConfigurationHandlerParameter,
) => UpdateRCConfigurationHandlerReturnType;

export const updateRCConfigurationHandler: UpdateRCConfigurationHandler =
  ({
    config,
    rccModel,
    redisClientFactory,
    telemetryClient,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  }) =>
  ({
    configurationId,
    newRCConfiguration,
    subscriptionId,
    userGroups,
    userId,
  }) =>
    pipe(
      checkGroupAndManageSubscription(subscriptionId, userGroups),
      TE.chainW(() =>
        pipe(handleGetRCConfiguration(rccModel, configurationId)),
      ),
      TE.chainW(handleEmptyConfiguration),
      TE.chainW(isUserAllowedToUpdateConfiguration(userId)),
      TE.map(() =>
        makeNewRCConfigurationWithConfigurationId(
          () => configurationId,
          userId,
          newRCConfiguration,
        ),
      ),
      TE.chainW(
        handleUpsert({ config, rccModel, redisClientFactory, telemetryClient }),
      ),
      TE.toUnion,
    )();

interface IGetUpdateRCConfigurationHandlerParameter {
  readonly config: IConfig;
  readonly rccModel: RCConfigurationModel;
  readonly redisClientFactory: RedisClientFactory;
  readonly telemetryClient?: TelemetryClient;
}

type GetUpdateRCConfigurationHandlerReturnType = express.RequestHandler;

type GetUpdateRCConfigurationHandler = (
  parameter: IGetUpdateRCConfigurationHandlerParameter,
) => GetUpdateRCConfigurationHandlerReturnType;

export const getUpdateRCConfigurationExpressHandler: GetUpdateRCConfigurationHandler =
  ({ config, rccModel, redisClientFactory, telemetryClient }) => {
    const handler = updateRCConfigurationHandler({
      config,
      rccModel,
      redisClientFactory,
      telemetryClient,
    });

    const middlewaresWrap = withRequestMiddlewares(
      ContextMiddleware(),
      RequiredSubscriptionIdMiddleware(),
      RequiredUserGroupsMiddleware(),
      RequiredUserIdMiddleware(),
      RequiredParamMiddleware("configurationId", Ulid),
      RequiredBodyPayloadMiddleware(NewRCConfigurationPublic),
    );

    return wrapRequestHandler(
      middlewaresWrap(
        (
          _,
          subscriptionId,
          userGroups,
          userId,
          configurationId,
          newRCConfiguration,
          // eslint-disable-next-line max-params
        ) =>
          handler({
            configurationId,
            newRCConfiguration,
            subscriptionId,
            userGroups,
            userId,
          }),
      ),
    );
  };
