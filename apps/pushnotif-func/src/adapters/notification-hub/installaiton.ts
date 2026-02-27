import { NotificationHubsClient } from "@azure/notification-hubs";
import { RestError } from "@azure/storage-queue";
import { z } from "zod";

import { ErrorNotFound, ErrorValidation } from "../../domain/error";
import { Installation, installationSchema } from "../../domain/installation";
import { JsonPatch } from "../../domain/json-patch";
import { InstallationRepository } from "../../domain/push-service";

export class NotificationHubInstallationAdapter
  implements InstallationRepository
{
  nhClientPartitions: NotificationHubsClient[];

  constructor(nhClientPartitions: NotificationHubsClient[]) {
    this.nhClientPartitions = nhClientPartitions;
  }

  private getPartition(installationId: string): NotificationHubsClient {
    const firstChar = installationId[0].toLocaleLowerCase();

    switch (true) {
      case /[0-3]/.test(firstChar):
        return this.nhClientPartitions[0];
      case /[4-7]/.test(firstChar):
        return this.nhClientPartitions[1];
      case /[8-9a-b]/.test(firstChar):
        return this.nhClientPartitions[2];
      case /[c-f]/.test(firstChar):
        return this.nhClientPartitions[3];
      default:
        // This case will never happen cause we know that `installationId` is
        // sha256
        throw new Error(
          `Unexpected character [${firstChar}] in installationId: ${installationId}`,
        );
    }
  }

  async getInstallation(
    id: string,
  ): Promise<Error | ErrorNotFound | Installation> {
    const nhPartition = this.getPartition(id);

    try {
      const installation = await nhPartition.getInstallation(id);

      return installationSchema.parse(installation);
    } catch (err) {
      if (err instanceof RestError) {
        switch (err.statusCode) {
          case 404:
            return new ErrorNotFound(`Installation not found`, err);
          default:
            return new Error(`Unhandled error from notification hub: ${err}`);
        }
      }

      if (err instanceof z.ZodError) {
        return new ErrorValidation(
          `Error parsing the installation from notification hub: ${err}`,
        );
      }

      return new Error(`Error from notification hub: ${err}`);
    }
  }

  async updateInstallation(
    id: string,
    patches: JsonPatch[],
  ): Promise<Error | string> {
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
            return new Error(`Too many request to notification hub`);
          default:
            return new Error(`Generic error from notification hub ${err}`);
        }
      }

      if (err instanceof z.ZodError) {
        return new Error(
          `Error parsing the installation from notification hub ${err}`,
        );
      }

      return new Error(`Error from notification hub: ${err}`);
    }
  }
}
