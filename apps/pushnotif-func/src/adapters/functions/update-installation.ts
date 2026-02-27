import z from "zod";
import { TelemetryService } from "../../domain/telemetry";
import { StorageQueueHandler } from "@azure/functions";
import { InstallationRepository } from "../../domain/push-service";
import { ErrorNotFound } from "../../domain/error";
import { JsonPatch } from "../../domain/json-patch";
import { supportedPlatformSchema } from "../../domain/installation";

const apnsNewTemplate =
  '{"aps": {"alert": {"title": "$(title)", "body": "$(message)"}}, "custom": "$(custom)", "message_id": "$(message_id)"}';
const fcmv1NewTemplate =
  '{"message": {"notification": {"title": "$(title)", "body": "$(message)"}, "android": {"data": {"message_id": "$(message_id)", "custom": "$(custom)"}, "notification": {"icon": "ic_notification"}}}}';

const updateInstallationMessageSchema = z.object({
  installationId: z.hash("sha256"),
  platform: supportedPlatformSchema,
});

const getUpdateInstallationHandler =
  (
    telemetryService: TelemetryService,
    installationService: InstallationRepository,
  ): StorageQueueHandler =>
  async (queueMessage: unknown) => {
    const parsedResult =
      updateInstallationMessageSchema.safeParse(queueMessage);

    if (!parsedResult.success) {
      telemetryService.trackEvent(
        "installation.update.message.validation.error",
        {
          message: "Invalid updateInstallationMessage in the queue",
          invalidDocument: queueMessage,
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
          parsedResult.data.platform == "Apns"
            ? apnsNewTemplate
            : fcmv1NewTemplate,
      },
    ];

    const errorOrUpdatedInstallation =
      await installationService.updateInstallation(
        parsedResult.data.installationId,
        patches,
      );

    if (errorOrUpdatedInstallation instanceof ErrorNotFound) {
      // If the installation is not found then we simply end the execution
      // knowing that tere is nothing to update.
      return;
    }

    if (errorOrUpdatedInstallation instanceof Error) {
      throw errorOrUpdatedInstallation;
    }
  };

export default getUpdateInstallationHandler;
