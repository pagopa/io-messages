import { NotificationHubsClient } from "@azure/notification-hubs";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { strict as assert } from "node:assert";

import { InstallationId } from "../generated/notifications/InstallationId";
import { DisjoitedNotificationHubPartitionArray } from "./types";

/**
 * @param sha The sha to test
 * @returns
 */
export const testShaForPartitionRegex = (
  regex: RegExp | string,
  sha: InstallationId,
): boolean => (typeof regex === "string" ? new RegExp(regex) : regex).test(sha);

export class NotificationHubPartitionFactory {
  #hash: (installationId: NonEmptyString) => string | undefined;
  #m: Map<string, NotificationHubsClient>;

  constructor(partitions: DisjoitedNotificationHubPartitionArray) {
    this.#m = new Map(
      partitions.map((p) => [
        p.name,
        new NotificationHubsClient(p.endpoint, p.name),
      ]),
    );

    this.#hash = (installationId: NonEmptyString) => {
      const partition = partitions.find((p) =>
        testShaForPartitionRegex(p.partitionRegex, installationId),
      );

      return partition?.name;
    };
  }

  getPartition(installationId: NonEmptyString): NotificationHubsClient {
    const partitionName = this.#hash(installationId);
    assert(
      partitionName,
      `Unable to find notification hub partition for installationId ${installationId}`,
    );

    const client = this.#m.get(partitionName);
    assert(
      client,
      `Cannot find the correct NH partition for installationId: ${installationId}`,
    );

    return client;
  }
}
