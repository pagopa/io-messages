import { CosmosClient } from "@azure/cosmos";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import {
  common as azurestorageCommon,
  createBlobService,
  createQueueService,
} from "azure-storage";
import { sequenceT } from "fp-ts/lib/Apply";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { IConfig, getConfig } from "./config";

type ProblemSource = "AzureCosmosDB" | "AzureStorage" | "Config";

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

/**
 * Check application's configuration is correct
 *
 * @returns either true or an array of error messages
 */
export const checkConfigHealth = (): HealthCheck<"Config", IConfig> =>
  pipe(
    TE.fromEither(getConfig()),
    TE.mapLeft((errors) =>
      errors.map((e) =>
        // give each problem its own line
        formatProblem("Config", readableReport([e])),
      ),
    ),
  );

/**
 * Check the application can connect to an Azure CosmosDb instances
 *
 * @param dbUri uri of the database
 * @param dbUri connection string for the storage
 *
 * @returns either true or an array of error messages
 */
export const checkAzureCosmosDbHealth = (
  cosmosClient: CosmosClient,
): HealthCheck<"AzureCosmosDB", true> =>
  pipe(
    TE.tryCatch(
      () => cosmosClient.getDatabaseAccount(),
      toHealthProblems("AzureCosmosDB"),
    ),
    TE.map(() => true),
  );

/**
 * Check the application can connect to an Azure Storage
 *
 * @param connStr connection string for the storage
 *
 * @returns either true or an array of error messages
 */
export const checkAzureStorageHealth = (
  connStr: string,
): HealthCheck<"AzureStorage"> => {
  const applicativeValidation = TE.getApplicativeTaskValidation(
    T.ApplicativePar,
    RA.getSemigroup<HealthProblem<"AzureStorage">>(),
  );

  // try to instantiate a client for each product of azure storage
  return pipe(
    [createBlobService, createQueueService]
      // for each, create a task that wraps getServiceProperties
      .map((createService) =>
        TE.tryCatch(
          () =>
            new Promise<azurestorageCommon.models.ServicePropertiesResult.ServiceProperties>(
              (resolve, reject) =>
                createService(connStr).getServiceProperties((err, result) => {
                  if (err) reject(err.message.replace(/\n/gim, " ")); // avoid newlines
                  resolve(result);
                }),
            ),
          toHealthProblems("AzureStorage"),
        ),
      ),
    // run each taskEither and gather validation errors from each one of them, if any
    A.sequence(applicativeValidation),
    TE.map(() => true),
  );
};

/**
 * Execute all the health checks for the application
 *
 * @returns either true or an array of error messages
 */
export const checkApplicationHealth = (
  cosmosClient: CosmosClient,
  remoteContentCosmosClient: CosmosClient,
): HealthCheck<ProblemSource, true> => {
  const applicativeValidation = TE.getApplicativeTaskValidation(
    T.ApplicativePar,
    RA.getSemigroup<HealthProblem<ProblemSource>>(),
  );

  return pipe(
    TE.of(undefined),
    TE.chain(() => checkConfigHealth()),
    TE.chain((config) =>
      // run each taskEither and collect validation errors from each one of them, if any
      sequenceT(applicativeValidation)(
        checkAzureCosmosDbHealth(cosmosClient),
        checkAzureCosmosDbHealth(remoteContentCosmosClient),
        checkAzureStorageHealth(
          config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
        ),
      ),
    ),
    TE.map(() => true),
  );
};
