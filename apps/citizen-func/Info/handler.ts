import * as express from "express";

import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as packageJson from "../package.json";

import { checkApplicationHealth, HealthCheck } from "../utils/healthcheck";
import { CosmosClient } from "@azure/cosmos";

interface IInfo {
  readonly name: string;
  readonly version: string;
}

type InfoHandler = () => Promise<
  IResponseSuccessJson<IInfo> | IResponseErrorInternal
>;

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function InfoHandler(healthCheck: HealthCheck): InfoHandler {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return () =>
    pipe(
      healthCheck,
      TE.bimap(
        (problems) => ResponseErrorInternal(problems.join("\n\n")),
        (_) =>
          ResponseSuccessJson({
            name: packageJson.name,
            version: packageJson.version,
          }),
      ),
      TE.toUnion,
    )();
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function Info(
  cosmosClient: CosmosClient,
  remoteContentCosmosClient: CosmosClient,
): express.RequestHandler {
  const handler = InfoHandler(
    checkApplicationHealth(cosmosClient, remoteContentCosmosClient),
  );

  return wrapRequestHandler(handler);
}
