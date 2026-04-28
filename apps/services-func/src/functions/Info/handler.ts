/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { wrapHandlerV4 } from "@pagopa/io-functions-commons/dist/src/utils/azure-functions-v4-express-adapter";
import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import * as packageJson from "../../../package.json";
import { IConfig, envConfig } from "../../utils/config";

type ProblemSource = "AzureCosmosDB" | "AzureStorage" | "Config" | "Url";

export type HealthProblem<S extends ProblemSource> = { __source: S } & string;
export type HealthCheck<
  S extends ProblemSource = ProblemSource,
  True = true,
> = TE.TaskEither<readonly HealthProblem<S>[], True>;

// format and cast a problem message with its source
const formatProblem = <S extends ProblemSource>(
  source: S,
  message: string,
): HealthProblem<S> => `${source}|${message}` as HealthProblem<S>;

// utility to format an unknown error to an arry of HealthProblem
const toHealthProblems =
  <S extends ProblemSource>(source: S) =>
  (e: unknown): readonly HealthProblem<S>[] => [
    formatProblem(source, E.toError(e).message),
  ];

export const checkAzureStorageHealth = (
  connStr: string,
): HealthCheck<"AzureStorage"> => {
  const applicativeValidation = TE.getApplicativeTaskValidation(
    T.ApplicativePar,
    RA.getSemigroup<HealthProblem<"AzureStorage">>(),
  );

  // try to instantiate a client for each product of azure storage
  return pipe(
    [
      () => BlobServiceClient.fromConnectionString(connStr).getProperties(),
      () => QueueServiceClient.fromConnectionString(connStr).getProperties(),
    ]
      // for each, create a task that wraps getProperties
      .map((getProperties) =>
        TE.tryCatch(getProperties, toHealthProblems("AzureStorage")),
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
) => HealthCheck<"AzureCosmosDB" | "AzureStorage" | "Config" | "Url", true>;

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

export function Info() {
  const handler = InfoHandler(
    healthcheck.checkApplicationHealth(IConfig, [
      (c) =>
        healthcheck.checkAzureCosmosDbHealth(c.COSMOSDB_URI, c.COSMOSDB_KEY),
      (c) =>
        checkAzureStorageHealth(c.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING),
      (c) => checkAzureStorageHealth(c.IO_COM_STORAGE_CONNECTION_STRING),
      (c) =>
        pipe(
          TE.tryCatch(
            () => fetch(`${c.NOTIFY_API_URL}/api/v1/info`),
            toHealthProblems<"Url">("Url"),
          ),
          TE.map(() => true),
        ),
    ]),
  );

  return wrapHandlerV4([], handler);
}
