import { app } from "@azure/functions";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import LollipopClient from "io-messages-common/adapters/lollipop/lollipop-client";
import { createLollipopMiddleware } from "io-messages-common/adapters/lollipop/lollipop-middleware";
import { handlerWithMiddleware } from "io-messages-common/adapters/middleware";

import { Config, configFromEnvironment } from "./adapters/config.js";
import { getAttachment } from "./adapters/functions/aar-attachments.js";
import { getNotification } from "./adapters/functions/aar-notifications.js";
import { aarQRCodeCheck } from "./adapters/functions/aar-qrcode-check.js";
import { healthcheck } from "./adapters/functions/health.js";
import SendNotificationClient from "./adapters/send/notification.js";
import { GetAttachmentUseCase } from "./domain/use-cases/get-attachment.js";
import { GetNotificationUseCase } from "./domain/use-cases/get-notification.js";
import { HealthUseCase } from "./domain/use-cases/health.js";
import { QrCodeCheckUseCase } from "./domain/use-cases/qr-code-check.js";

const main = async (config: Config): Promise<void> => {
  const healthcheckUseCase = new HealthUseCase([]);

  const getNotificationClient = (isTest: boolean): SendNotificationClient => {
    const selectedConfig = isTest
      ? config.notificationUatClient
      : config.notificationClient;

    return new SendNotificationClient(
      selectedConfig.apiKey,
      selectedConfig.baseUrl,
    );
  };

  const qrCodeCheckUseCase = new QrCodeCheckUseCase(getNotificationClient);
  const getNotificationUseCase = new GetNotificationUseCase(
    getNotificationClient,
  );
  const getAttachmentUseCase = new GetAttachmentUseCase(getNotificationClient);

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
      aarQRCodeCheck(qrCodeCheckUseCase),
    ),
    methods: ["POST"],
    route: "aar/qr-code-check",
  });

  app.http("GetAARNotification", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      getNotification(getNotificationUseCase),
    ),
    methods: ["GET"],
    route: "aar/notifications/{iun}",
  });

  app.http("getNotificationAttachment", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      getAttachment(getAttachmentUseCase),
    ),
    methods: ["GET"],
    route: "aar/attachments/{attachmentUrl}",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
