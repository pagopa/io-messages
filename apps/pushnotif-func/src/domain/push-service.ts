import { z } from "zod";

import { ErrorInternal, ErrorNotFound, ErrorTooManyRequests } from "./error";
import { JsonPatch } from "./json-patch";
import {
  MassiveNotificationMessage,
  MassiveNotificationTags,
  MassiveNotificationTitle,
} from "./massive-jobs";

export const notificationDetailStatusEnum = z.enum([
  "Enqueued",
  "Processing",
  "Completed",
  "Abandoned",
  "Cancelled",
  "NoTargetFound",
  "Unknown",
]);
export type NotificationDetailStatus = z.TypeOf<
  typeof notificationDetailStatusEnum
>;

export const notificationDetailSchema = z.object({
  notificationId: z.string().min(1),
  state: notificationDetailStatusEnum,
});
export type NotificationDetails = z.TypeOf<typeof notificationDetailSchema>;

export interface InstallationRepository {
  /**
   * updateInstallation perform an update operation on the installation
   * identified by the `id` using the provided patches.
   * */
  updateInstallation(
    id: string,
    patches: JsonPatch[],
  ): Promise<ErrorInternal | ErrorNotFound | ErrorTooManyRequests | string>;
}

export interface PushNotificationRepository {
  cancelScheduledNotification(
    notificationId: string,
    tag: string,
  ): Promise<ErrorInternal | ErrorNotFound | ErrorTooManyRequests | string>;
  getMassiveNotificationDetail(
    notificationId: string,
    tag: string,
  ): Promise<
    ErrorInternal | ErrorNotFound | ErrorTooManyRequests | NotificationDetails
  >;

  scheduleMassiveNotification(
    title: MassiveNotificationTitle,
    body: MassiveNotificationMessage,
    scheduledTimestamp: number,
    tags: MassiveNotificationTags,
  ): Promise<{ notificationID: string; tags: string[] }[] | ErrorInternal>;
}
