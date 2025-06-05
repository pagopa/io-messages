/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson,
} from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import * as packageJson from "../package.json";
import { IConfig, envConfig } from "../utils/config";
import { checkAzureNotificationHub } from "../utils/healthcheck";
import { NotificationHubPartitionFactory } from "../utils/notificationhubServicePartition";

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
  "AzureNotificationHub" | "AzureStorage" | "Config",
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
        healthcheck.checkAzureStorageHealth(
          c.NOTIFICATIONS_STORAGE_CONNECTION_STRING,
        ),
      //check all partitions using ids to match all partitions regex
      ...["0", "4", "8", "c"].map((i) => (c: t.TypeOf<typeof IConfig>) => {
        const nhPartitionFactory = new NotificationHubPartitionFactory(
          c.AZURE_NOTIFICATION_HUB_PARTITIONS,
        );
        return checkAzureNotificationHub(
          nhPartitionFactory,
          i as NonEmptyString,
        );
      }),
    ]),
  );

  return wrapRequestHandler(handler);
}
