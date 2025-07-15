/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { toHealthProblems } from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import { common, createBlobService, createQueueService } from "azure-storage";
import * as express from "express";
import * as A from "fp-ts/lib/Array";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import * as packageJson from "../../../package.json";
import { IConfig, envConfig } from "../../utils/config";

export const checkAzureStorageHealth = (
  connStr: string,
): healthcheck.HealthCheck<"AzureStorage"> => {
  const applicativeValidation = TE.getApplicativeTaskValidation(
    T.ApplicativePar,
    RA.getSemigroup<healthcheck.HealthProblem<"AzureStorage">>(),
  );

  // try to instantiate a client for each product of azure storage
  return pipe(
    [createBlobService, createQueueService]
      // for each, create a task that wraps getServiceProperties
      .map((createService) =>
        TE.tryCatch(
          () =>
            new Promise<common.models.ServicePropertiesResult.ServiceProperties>(
              (resolve, reject) =>
                createService(connStr).getServiceProperties((err, result) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  err
                    ? reject(err.message.replace(/\n/gim, " ")) // avoid newlines
                    : resolve(result);
                }),
            ),
          toHealthProblems<"AzureStorage">("AzureStorage"),
        ),
      ),
    // run each taskEither and gather validation errors from each one of them, if any
    A.sequence(applicativeValidation),
    TE.map(() => true),
  );
};

interface IInfo {
  readonly name: string;
  readonly version: string;
}

type InfoHandler = () => Promise<
  IResponseErrorInternal | IResponseSuccessJson<IInfo>
>;

type HealthChecker = (
  config: unknown,
) => healthcheck.HealthCheck<
  "AzureCosmosDB" | "AzureStorage" | "Config" | "Url",
  true
>;

export function InfoHandler(healthCheck: HealthChecker): InfoHandler {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return () =>
    pipe(
      envConfig,
      healthCheck,
      TE.mapLeft((problems) => ResponseErrorInternal(problems.join("\n\n"))),
      TE.map(() =>
        ResponseSuccessJson({
          name: packageJson.name,
          version: packageJson.version,
        }),
      ),
      TE.toUnion,
    )();
}

export function Info(): express.RequestHandler {
  const handler = InfoHandler(
    healthcheck.checkApplicationHealth(IConfig, [
      (c) =>
        healthcheck.checkAzureCosmosDbHealth(c.COSMOSDB_URI, c.COSMOSDB_KEY),
      (c) =>
        checkAzureStorageHealth(c.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING),
      (c) => checkAzureStorageHealth(c.INTERNAL_STORAGE_CONNECTION_STRING),
      (c) =>
        pipe(
          TE.tryCatch(
            () => fetch(`${c.SENDING_FUNC_API_URL}/api/v1/info`),
            toHealthProblems<"Url">("Url"),
          ),
          TE.map(() => true),
        ),
    ]),
  );

  return wrapRequestHandler(handler);
}
