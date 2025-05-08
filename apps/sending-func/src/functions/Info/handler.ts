import { CosmosClient } from "@azure/cosmos";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import * as express from "express";
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

export function Info(
  cosmosClient: CosmosClient,
  remoteContentCosmosClient: CosmosClient,
): express.RequestHandler {
  const handler = InfoHandler(
    checkApplicationHealth(cosmosClient, remoteContentCosmosClient),
  );

  return wrapRequestHandler(handler);
}
