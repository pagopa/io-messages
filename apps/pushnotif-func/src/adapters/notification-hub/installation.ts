import { NotificationHubsClient } from "@azure/notification-hubs";
import { RestError } from "@azure/storage-queue";

import {
  ErrorInternal,
  ErrorNotFound,
  ErrorTooManyRequests,
} from "../../domain/error";
import { JsonPatch } from "../../domain/json-patch";
import { InstallationRepository } from "../../domain/push-service";

export class NotificationHubInstallationAdapter
  implements InstallationRepository
{
  #nhClientPartitions: NotificationHubsClient[];
  #nhPartitionRegexes: RegExp[];

  constructor(
    nhClientPartitions: NotificationHubsClient[],
    nhPartitionRegexes: RegExp[],
  ) {
    this.#nhClientPartitions = nhClientPartitions;
    this.#nhPartitionRegexes = nhPartitionRegexes;
  }

  private getPartition(installationId: string): NotificationHubsClient {
    const firstChar = installationId[0].toLocaleLowerCase();

    switch (true) {
      case this.#nhPartitionRegexes[0].test(firstChar):
        return this.#nhClientPartitions[0];
      case this.#nhPartitionRegexes[1].test(firstChar):
        return this.#nhClientPartitions[1];
      case this.#nhPartitionRegexes[2].test(firstChar):
        return this.#nhClientPartitions[2];
      case this.#nhPartitionRegexes[3].test(firstChar):
        return this.#nhClientPartitions[3];
      default:
        // This case will never happen cause we know that `installationId` is
        // sha256
        throw new Error(
          `Unexpected character [${firstChar}] in installationId: ${installationId}`,
        );
    }
  }

  async updateInstallation(id: string, patches: JsonPatch[]) {
    const nhPartition = this.getPartition(id);

    try {
      await nhPartition.updateInstallation(id, patches);

      return id;
    } catch (err) {
      if (err instanceof RestError) {
        switch (err.statusCode) {
          case 404:
            return new ErrorNotFound(`Installation not found`, err);
          case 429:
            return new ErrorTooManyRequests(
              `Too many request to notification hub`,
            );
          default:
            return new ErrorInternal(
              `Generic error from notification hub: ${err.message}`,
            );
        }
      }

      return new ErrorInternal(`Error from notification hub: ${err}`);
    }
  }
}
