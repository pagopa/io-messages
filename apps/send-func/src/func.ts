import { app } from "@azure/functions";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import LollipopClient from "io-messages-common/adapters/lollipop/lollipop-client";
import { createLollipopMiddleware } from "io-messages-common/adapters/lollipop/lollipop-middleware-real";
import { handlerWithMiddleware } from "io-messages-common/adapters/middleware";

import { Config, configFromEnvironment } from "./adapters/config.js";
import { getNotification } from "./adapters/functions/aar-notifications.js";
import { aarQRCodeCheck } from "./adapters/functions/aar-qrcode-check.js";
import { healthcheck } from "./adapters/functions/health.js";
import NotificationClient from "./adapters/send/notification.js";
import { HealthUseCase } from "./domain/use-cases/health.js";

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

  const lollipopClient = new LollipopClient(
    config.lollipop.apiKey,
    config.lollipop.baseUrl,
  );
  const lollipopMiddleware = createLollipopMiddleware(lollipopClient);

  app.http("Health", {
    authLevel: "anonymous",
    handler: healthcheck(healthcheckUseCase),
    methods: ["GET"],
    route: "health",
  });

  app.http("AARQrCodeCheck", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      aarQRCodeCheck(notificationClient, uatNotificationClient),
    ),
    methods: ["POST"],
    route: "aar/qr-code-check",
  });

  app.http("GetAARNotification", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      getNotification(notificationClient, uatNotificationClient),
    ),
    methods: ["GET"],
    route: "aar/notifications/{iun}",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
