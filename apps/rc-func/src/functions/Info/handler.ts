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

export function InfoHandler(healthCheck: HealthCheck): InfoHandler {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return () =>
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
}

export function getInfoHandler(
  cosmosClient: CosmosClient,
  remoteContentCosmosClient: CosmosClient,
): ReturnType<typeof wrapHandlerV4> {
  const handler = InfoHandler(
    checkApplicationHealth(cosmosClient, remoteContentCosmosClient),
  );

  return wrapHandlerV4([], handler);
}
