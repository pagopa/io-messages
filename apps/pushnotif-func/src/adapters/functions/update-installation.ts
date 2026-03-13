import { StorageQueueHandler } from "@azure/functions";
import z from "zod";

import { ErrorNotFound } from "../../domain/error";
import { supportedPlatformSchema } from "../../domain/installation";
import { JsonPatch } from "../../domain/json-patch";
import { InstallationRepository } from "../../domain/push-service";
import { TelemetryService } from "../../domain/telemetry";

const apnsNewTemplate =
  '{"aps": {"alert": {"title": "$(title)", "body": "$(message)"}}, "custom": "$(custom)"}';
const fcmv1NewTemplate =
  '{"message": {"notification": {"title": "$(title)", "body": "$(message)"}, "android": {"data": {"custom": "$(custom)"}, "notification": {"icon": "ic_notification"}}}}';

const updateInstallationMessageSchema = z.object({
  installationId: z.hash("sha256"),
  platform: supportedPlatformSchema,
});

const getUpdateInstallationHandler =
  (
    telemetryService: TelemetryService,
    installationRepository: InstallationRepository,
  ): StorageQueueHandler =>
  async (queueMessage: unknown) => {
    const parsedResult =
      updateInstallationMessageSchema.safeParse(queueMessage);

    if (!parsedResult.success) {
      telemetryService.trackEvent(
        "installation.update.message.validation.error",
        {
          invalidDocument: queueMessage,
          message: "Invalid updateInstallationMessage in the queue",
          validationError: parsedResult.error.issues,
        },
      );

      return;
    }

    // Add a new template for massive push.
    const patches: JsonPatch[] = [
      {
        op: "add",
        path: "/templates/massive",
        value: "{}",
      },
      {
        op: "add",
        path: "/templates/massive/tags",
        value: `["${parsedResult.data.installationId.substring(0, 3)}"]`,
      },
      {
        op: "add",
        path: "/templates/massive/body",
        value:
          parsedResult.data.platform === "apns"
            ? apnsNewTemplate
            : fcmv1NewTemplate,
      },
    ];

    const errorOrUpdatedInstallation =
      await installationRepository.updateInstallation(
        parsedResult.data.installationId,
        patches,
      );

    if (errorOrUpdatedInstallation instanceof ErrorNotFound) {
      // If the installation is not found then we simply end the execution
      // knowing that there is nothing to update.
      return;
    }

    if (errorOrUpdatedInstallation instanceof Error) {
      throw errorOrUpdatedInstallation;
    }
  };

export default getUpdateInstallationHandler;
