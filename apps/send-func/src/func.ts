import { app } from "@azure/functions";

import { healthcheck } from "./adapters/functions/health.js";
import { HealthUseCase } from "./domain/use-cases/health.js";
import NotificationClient from "./adapters/send/notification.js";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { aarQRCodeCheck } from "./adapters/functions/aar-qrcode-check.js";
import { getNotification } from "./adapters/functions/notifications.js";

const main = async (config: Config): Promise<void> => {
  const healthcheckUseCase = new HealthUseCase([]);

  const notificationClient = new NotificationClient(
    config.notificationClient.apiKey,
    config.notificationClient.baseUrl,
  );

  const uatNotificationClient = new NotificationClient(
    config.notificationUatClient.apiKey,
    config.notificationUatClient.baseUrl,
  );

  app.http("Health", {
    authLevel: "anonymous",
    handler: healthcheck(healthcheckUseCase),
    methods: ["GET"],
    route: "health",
  });

  app.http("AARQrCodeCheck", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "aar/qr-code-check",
    handler: aarQRCodeCheck(notificationClient, uatNotificationClient),
  });

  app.http("GetAARNotification", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "aar/notifications/{iun}",
    handler: getNotification(notificationClient, uatNotificationClient),
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
