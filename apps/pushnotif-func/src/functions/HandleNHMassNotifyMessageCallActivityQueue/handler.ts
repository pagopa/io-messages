import { TelemetryClient } from "applicationinsights";

import { massNotify } from "../../utils/notification";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";
import { NhMassNotifyMessageRequest } from "../../utils/types";
import { NotificationHubsMessageResponse } from "@azure/notification-hubs";

export const handle = async (
  inputRequest: unknown,
  telemetryClient: TelemetryClient,
  nhPartitionFactory: NotificationHubPartitionFactory,
): Promise<NotificationHubsMessageResponse> => {
  const requestAsBase64 = String(inputRequest);
  const requestJsonString = Buffer.from(requestAsBase64, "base64").toString();
  const parsedRequest = JSON.parse(requestJsonString);

  const decodedRequest = NhMassNotifyMessageRequest.safeParse(parsedRequest);

  if (!decodedRequest.success) {
    throw decodedRequest.error;
  }

  const { message } = decodedRequest.data;
  try {
    const result = await massNotify(
      nhPartitionFactory.getAllPartitions(),
      message.template,
      message.tags,
      message.payload,
      telemetryClient,
    );
    telemetryClient.trackEvent({
      name: "api.messages.notification.push.sent",
      properties: {
        isSuccess: result.successCount > 0 ? "true" : "false",
      },
      tagOverrides: { samplingEnabled: "false" },
    });

    return result;
  } catch (error: any) {
    telemetryClient.trackEvent({
      name: "api.messages.notification.push.sent.failure",
      properties: {
        isSuccess: "false",
        reason: error.message,
      },
      tagOverrides: { samplingEnabled: "false" },
    });

    throw error;
  }
};
