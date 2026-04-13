import { isRestError } from "@azure/core-rest-pipeline";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { z } from "zod";

import {
  ErrorInternal,
  ErrorNotFound,
  ErrorTooManyRequests,
} from "../../domain/error";
import {
  PushNotificationRepository,
  notificationDetailSchema,
} from "../../domain/push-service";

export class NotificationHubPushNotificationAdapter
  implements PushNotificationRepository
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
  private getPartitionFromProgressTag(
    progressTag: string,
  ): NotificationHubsClient {
    const firstChar = progressTag[0].toLocaleLowerCase();

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
          `Unexpected character [${firstChar}] in progressTag: ${progressTag}`,
        );
    }
  }

  async getMassiveNotificationDetail(notificationID: string, tag: string) {
    const nhClient = this.getPartitionFromProgressTag(tag);

    try {
      const notificationDetailResponse =
        await nhClient.getNotificationOutcomeDetails(notificationID);

      return notificationDetailSchema.parse(notificationDetailResponse);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return new ErrorInternal(
          "Invalid notification detail received from Notification Hub",
          err.issues,
        );
      }

      if (isRestError(err)) {
        switch (err.statusCode) {
          case 404:
            return new ErrorNotFound(
              `Could not find any notification with notificationID: ${notificationID}`,
              err.message,
            );

          case 429:
            return new ErrorTooManyRequests(
              `Too many requests to Notification hub`,
              err.message,
            );

          default:
            return new ErrorInternal(
              "Error while getting the notification from notification hub",
              err.message,
            );
        }
      }

      return new ErrorInternal(
        `Error while getting the notification from notification hub ${JSON.stringify(err)}`,
      );
    }
  }
}
