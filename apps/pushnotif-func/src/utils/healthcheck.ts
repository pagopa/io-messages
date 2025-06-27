import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { NotificationHubPartitionFactory } from "./notificationhubServicePartition";

/**
 * Check connections to Notification Hubs
 *
 * @returns either true or an array of error messages
 */
export const checkAzureNotificationHub = (
  nhPartitionFactory: NotificationHubPartitionFactory,
  installationId: NonEmptyString,
): healthcheck.HealthCheck<"AzureNotificationHub"> =>
  pipe(
    TE.tryCatch(
      () =>
        nhPartitionFactory
          .getPartition(installationId)
          .deleteInstallation(installationId),
      healthcheck.toHealthProblems("AzureNotificationHub" as const),
    ),
    TE.map(() => true),
  );
