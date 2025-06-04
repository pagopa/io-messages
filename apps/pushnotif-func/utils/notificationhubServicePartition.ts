import { NotificationHubsClient } from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { InstallationId } from "../generated/notifications/InstallationId";
import { IConfig } from "./config";
import { DisjoitedNotificationHubPartitionArray } from "./types";

export const NotificationHubConfig = t.type({
  AZURE_NH_ENDPOINT: NonEmptyString,
  AZURE_NH_HUB_NAME: NonEmptyString,
});

export type NotificationHubConfig = t.TypeOf<typeof NotificationHubConfig>;

/**
 * It returns the configuration related to the Legacy Notification Hub instance
 *
 * @param envConfig the env config, containing
 *                  `AZURE_NH_ENDPOINT` and `AZURE_NH_HUB_NAME` variables
 */
export const getNHLegacyConfig = (
  envConfig: IConfig,
): NotificationHubConfig => ({
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME,
});

/**
 * @param sha The sha to test
 * @returns
 */
export const testShaForPartitionRegex = (
  regex: RegExp | string,
  sha: InstallationId,
): boolean => (typeof regex === "string" ? new RegExp(regex) : regex).test(sha);

/**
 * It returns the configuration related to one of the new Notification Hub instances
 * based on the partion mechanism defined
 *
 * @param envConfig the env config with Notification Hub connection strings and names
 * @param sha a valid hash256 representing a Fiscal Code
 */
export const getNotificationHubPartitionConfig =
  (envConfig: IConfig) =>
  (sha: InstallationId): NotificationHubConfig =>
    pipe(
      envConfig.AZURE_NOTIFICATION_HUB_PARTITIONS.find((p) =>
        testShaForPartitionRegex(p.partitionRegex, sha),
      ),
      E.fromNullable(
        Error(`Unable to find Notification Hub partition for ${sha}`),
      ),
      E.map((partition) => ({
        AZURE_NH_ENDPOINT: partition.endpoint,
        AZURE_NH_HUB_NAME: partition.name,
      })),
      E.getOrElseW((e) => {
        throw e;
      }),
    );

export const buildNHClient = ({
  AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME,
}: NotificationHubConfig): NotificationHubsClient =>
  new NotificationHubsClient(AZURE_NH_ENDPOINT, AZURE_NH_HUB_NAME);

export class NotificationHubPartitionFactory {
  #notificationHubPartitions: DisjoitedNotificationHubPartitionArray;
  #partitionClientsRecord: Record<number, NotificationHubsClient>;

  constructor(
    notificationHubPartitions: DisjoitedNotificationHubPartitionArray,
  ) {
    this.#notificationHubPartitions = notificationHubPartitions;
    this.#partitionClientsRecord = {};
    this.#notificationHubPartitions.forEach(
      (p, i) =>
        (this.#partitionClientsRecord[i] = new NotificationHubsClient(
          p.endpoint,
          p.name,
        )),
    );
  }

  getPartition(installationId: NonEmptyString): NotificationHubsClient {
    const nhPartition = this.#notificationHubPartitions.find((p) =>
      testShaForPartitionRegex(p.partitionRegex, installationId),
    );
    if (nhPartition === undefined) {
      throw new Error(
        `Unable to find Notification Hub partition for ${installationId}`,
      );
    }

    switch (nhPartition.name) {
      case this.#notificationHubPartitions[0].name:
        return this.#partitionClientsRecord[0];
      case this.#notificationHubPartitions[1].name:
        return this.#partitionClientsRecord[1];
      case this.#notificationHubPartitions[2].name:
        return this.#partitionClientsRecord[2];
      case this.#notificationHubPartitions[3].name:
        return this.#partitionClientsRecord[3];
      default:
        throw new Error(
          `Cannot find the correct NH partition for installationId: ${installationId}`,
        );
    }
  }
}
