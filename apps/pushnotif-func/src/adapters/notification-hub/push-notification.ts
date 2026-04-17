import {
  MassiveNotificationMessage,
  MassiveNotificationTags,
  MassiveNotificationTitle,
} from "@/domain/massive-jobs";
import { isRestError } from "@azure/core-rest-pipeline";
import {
  NotificationHubsClient,
  createTemplateNotification,
} from "@azure/notification-hubs";
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
    const index = this.getPartitionIndexFromProgressTag(progressTag);
    return this.#nhClientPartitions[index];
  }

  private getPartitionIndexFromProgressTag(progressTag: string): 0 | 1 | 2 | 3 {
    const firstChar = progressTag[0].toLocaleLowerCase();

    switch (true) {
      case this.#nhPartitionRegexes[0].test(firstChar):
        return 0;
      case this.#nhPartitionRegexes[1].test(firstChar):
        return 1;
      case this.#nhPartitionRegexes[2].test(firstChar):
        return 2;
      case this.#nhPartitionRegexes[3].test(firstChar):
        return 3;
      default:
        // This case will never happen cause we know that `installationId` is
        // sha256
        throw new Error(
          `Unexpected character [${firstChar}] in progressTag: ${progressTag}`,
        );
    }
  }

  async cancelScheduledNotification(notificationID: string, tag: string) {
    const nhClient = this.getPartitionFromProgressTag(tag);

    try {
      await nhClient.cancelScheduledNotification(notificationID);

      return notificationID;
    } catch (err) {
      if (isRestError(err)) {
        switch (err.statusCode) {
          case 404:
            return new ErrorNotFound(
              `Could not find any scheduled notification with notificationID: ${notificationID}`,
              err.message,
            );

          case 429:
            return new ErrorTooManyRequests(
              `Too many requests to Notification hub`,
              err.message,
            );

          default:
            return new ErrorInternal(
              "Error while canceling the scheduled notification from notification hub",
              err.message,
            );
        }
      }

      return new ErrorInternal(
        `Error while canceling the scheduled notification from notification hub ${err}`,
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

  async scheduleMassiveNotification(
    title: MassiveNotificationTitle,
    body: MassiveNotificationMessage,
    scheduledTimestamp: number,
    tags: MassiveNotificationTags,
  ) {
    // Every tag could refer to a different notification hub partition depending
    // on the first char, we need to know in which partition we want to schedule
    // the notification.
    //
    // tagsForIndex is an helper map to merge all the tags in the correct
    // partition index.
    const tagsForIndexMap = new Map<number, MassiveNotificationTags>();
    for (const tag of tags) {
      const partitionIndex = this.getPartitionIndexFromProgressTag(tag);

      const currentTags = tagsForIndexMap.get(partitionIndex);
      if (currentTags === undefined) {
        tagsForIndexMap.set(partitionIndex, [tag]);
        continue;
      }

      currentTags.push(tag);
      tagsForIndexMap.set(partitionIndex, currentTags);
    }

    // Now we know all the partitions where we want to schedule the notification.
    try {
      const notificationIDForTags: {
        notificationID: string;
        tags: string[];
      }[] = [];

      // Since the worst case scenario is that the length of tagsForIndex is 4
      // we can avoid using Promise.all(...).
      for (const [partitionIndex, tagList] of tagsForIndexMap) {
        const nhResponse = await this.#nhClientPartitions[
          partitionIndex
        ].scheduleNotification(
          new Date(scheduledTimestamp * 1000),
          createTemplateNotification({
            body: {
              message: body,
              title: title,
            },
          }),
          {
            // We know that tagList can never be of length 0 cause we already
            // validated as non-empty array before.
            tagExpression: `massive && ${`(${tagList.join("||")})`}`,
          },
        );

        const notificationID = z
          .string()
          .min(1)
          .parse(nhResponse.notificationId);

        notificationIDForTags.push({ notificationID, tags: tagList });
      }

      return notificationIDForTags;
    } catch (err) {
      // If the nhResponse does not contain a notificationID we consider it a
      // bloking error since we use it as model id key for the progress entity.
      if (err instanceof z.ZodError) {
        return new ErrorInternal(
          "Empty or invalid notificationID returned from the notification hub",
          err.message,
        );
      }

      if (isRestError(err)) {
        return new ErrorInternal(
          "Rest error while scheduling the notification",
          err.message,
        );
      }

      return new ErrorInternal(
        `Error while scheduling the notification ${JSON.stringify(err)}`,
      );
    }
  }
}
