import { InvocationContext } from "@azure/functions";
import { wrapHandlerV4 } from "@pagopa/io-functions-commons/dist/src/utils/azure-functions-v4-express-adapter";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import { retrievedRCConfigurationToPublic } from "@pagopa/io-functions-commons/dist/src/utils/rc_configuration";
import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import { Ulid } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { RCConfigurationPublic } from "../../generated/definitions/RCConfigurationPublic";
import RCConfigurationUtility from "../../utils/remoteContentConfig";

type IGetRCConfigurationHandlerResponse =
  | IResponseErrorInternal
  | IResponseErrorNotFound
  | IResponseSuccessJson<RCConfigurationPublic>;

/**
 * Type of a GetRCConfiguration handler.
 *
 * GetRCConfiguration expects a Configuration ID as input
 * and returns the remote content configuration as output or a Not Found or Validation
 * errors.
 */
type IGetRCConfigurationHandler = (
  context: InvocationContext,
  configurationId: Ulid,
) => Promise<IGetRCConfigurationHandlerResponse>;

/**
 * Handles requests for getting a single remote content configuration for the requested id.
 */
export const GetRCConfigurationHandler =
  (
    rcConfigurationUtility: RCConfigurationUtility,
  ): IGetRCConfigurationHandler =>
  async (_, configurationId): Promise<IGetRCConfigurationHandlerResponse> =>
    pipe(
      rcConfigurationUtility.getOrCacheMaybeRCConfigurationById(
        configurationId,
      ),
      TE.mapLeft((e) => ResponseErrorInternal(`${e.name}: ${e.message}`)),
      TE.chainW(
        TE.fromOption(() =>
          ResponseErrorNotFound(
            "Not Found",
            "The remote configuration that you requested was not found in the system.",
          ),
        ),
      ),
      TE.map(retrievedRCConfigurationToPublic),
      TE.map(ResponseSuccessJson),
      TE.toUnion,
    )();

/**
 * Wraps a GetRCConfiguration handler for Azure Functions v4.
 */
export const GetRCConfiguration = (
  rcConfigurationUtility: RCConfigurationUtility,
) => {
  const handler = GetRCConfigurationHandler(rcConfigurationUtility);
  const middlewares = [
    ContextMiddleware(),
    RequiredParamMiddleware("id", Ulid),
  ] as const;
  return wrapHandlerV4(middlewares, handler);
};
