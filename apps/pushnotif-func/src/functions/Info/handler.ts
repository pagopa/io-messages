import { CosmosClient } from "@azure/cosmos";
import { wrapHandlerV4 } from "@pagopa/io-functions-commons/dist/src/utils/azure-functions-v4-express-adapter";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { HealthCheck, checkApplicationHealth } from "../../utils/healthcheck";

type InfoHandler = () => Promise<
  | IResponseErrorInternal
  | IResponseSuccessJson<{
      message: string;
    }>
>;

export const InfoHandler =
  (healthCheck: HealthCheck): InfoHandler =>
  (): ReturnType<InfoHandler> =>
    pipe(
      healthCheck,
      TE.bimap(
        (problems) => ResponseErrorInternal(problems.join("\n\n")),
        () =>
          ResponseSuccessJson({
            message: "It works",
          }),
      ),
      TE.toUnion,
    )();

export const Info = (cosmosClient: CosmosClient) => {
  const handler = InfoHandler(checkApplicationHealth(cosmosClient));

  return wrapHandlerV4([], handler);
};
