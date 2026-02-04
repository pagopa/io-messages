import { app } from "@azure/functions";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import LollipopClient from "io-messages-common/adapters/lollipop/lollipop-client";
import { createLollipopMiddleware } from "io-messages-common/adapters/lollipop/lollipop-middleware";
import { handlerWithMiddleware } from "io-messages-common/adapters/middleware";

import {
  TelemetryEventService,
  initNoSamplingClient,
} from "./adapters/appinsights/appinsights.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { getAttachment } from "./adapters/functions/aar-attachments.js";
import {
  acceptNotificationMandate,
  createNotificationMandate,
} from "./adapters/functions/aar-notification-mandate.js";
import { getNotification } from "./adapters/functions/aar-notifications.js";
import { aarQRCodeCheck } from "./adapters/functions/aar-qrcode-check.js";
import { healthcheck } from "./adapters/functions/health.js";
import { infoHandler } from "./adapters/functions/info.js";
import { lollipopIntegrationCheck } from "./adapters/functions/lollipop-integration-check.js";
import LollipopIntegrationCheckClient from "./adapters/send/lollipop-integration-check.js";
import SendNotificationClient from "./adapters/send/notification.js";
import { AcceptNotificationMandateUseCase } from "./domain/use-cases/accept-notification-mandate.js";
import { CreateNotificationMandateUseCase } from "./domain/use-cases/create-notification-mandate.js";
import { GetAttachmentUseCase } from "./domain/use-cases/get-attachment.js";
import { GetNotificationUseCase } from "./domain/use-cases/get-notification.js";
import { HealthUseCase } from "./domain/use-cases/health.js";
import { LollipopLambdaCheckUseCase } from "./domain/use-cases/lollipop-lambda-check.js";
import { QrCodeCheckUseCase } from "./domain/use-cases/qr-code-check.js";

const main = async (config: Config): Promise<void> => {
  const healthcheckUseCase = new HealthUseCase([]);

  const telemetryClient = initNoSamplingClient(config.appInsights);
  const telemetryService = new TelemetryEventService(telemetryClient);

  const getNotificationClient = (isTest: boolean): SendNotificationClient => {
    const selectedConfig = isTest
      ? config.notificationUatClient
      : config.notificationClient;

    return new SendNotificationClient(
      selectedConfig.apiKey,
      selectedConfig.baseUrl,
    );
  };

  const getLollipopIntegrationCheckClient = (
    isTest: boolean,
  ): LollipopIntegrationCheckClient => {
    const selectedConfig = isTest
      ? config.lollipopLambdaUatClient
      : config.lollipopLambdaClient;

    return new LollipopIntegrationCheckClient(
      selectedConfig.baseUrl,
      selectedConfig.apiKey,
    );
  };
  const qrCodeCheckUseCase = new QrCodeCheckUseCase(getNotificationClient);
  const getNotificationUseCase = new GetNotificationUseCase(
    getNotificationClient,
  );
  const getAttachmentUseCase = new GetAttachmentUseCase(getNotificationClient);

  const createNotificationMandateUseCase = new CreateNotificationMandateUseCase(
    getNotificationClient,
  );

  const acceptNotificationMandateUseCase = new AcceptNotificationMandateUseCase(
    getNotificationClient,
  );

  const lambdaLollipopCheckUseCase = new LollipopLambdaCheckUseCase(
    getLollipopIntegrationCheckClient,
  );

  const lollipopClient = new LollipopClient(
    config.lollipop.apiKey,
    config.lollipop.baseUrl,
  );
  const lollipopMiddleware = createLollipopMiddleware(
    lollipopClient,
    telemetryService,
  );

  app.http("Health", {
    authLevel: "anonymous",
    handler: healthcheck(healthcheckUseCase),
    methods: ["GET"],
    route: "health",
  });

  app.http("Info", {
    authLevel: "anonymous",
    handler: infoHandler,
    methods: ["GET"],
    route: "info",
  });

  app.http("AARQrCodeCheck", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      aarQRCodeCheck(qrCodeCheckUseCase, telemetryService),
    ),
    methods: ["POST"],
    route: "aar/qr-code-check",
  });

  app.http("GetAARNotification", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      getNotification(getNotificationUseCase, telemetryService),
    ),
    methods: ["GET"],
    route: "aar/notifications/{iun}",
  });

  app.http("getNotificationAttachment", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      getAttachment(getAttachmentUseCase, telemetryService),
    ),
    methods: ["GET"],
    route: "aar/attachments/{attachmentUrl}",
  });

  app.http("CreateNotificationMandate", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      createNotificationMandate(
        createNotificationMandateUseCase,
        telemetryService,
      ),
    ),
    methods: ["POST"],
    route: "aar/mandates",
  });

  app.http("AcceptNotificationMandate", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      acceptNotificationMandate(
        acceptNotificationMandateUseCase,
        telemetryService,
      ),
    ),
    methods: ["PATCH"],
    route: "aar/mandates/{mandateId}",
  });

  app.http("LollipopIntegrationCheckGet", {
    authLevel: "anonymous",
    handler: handlerWithMiddleware(
      lollipopMiddleware,
      lollipopIntegrationCheck(lambdaLollipopCheckUseCase, telemetryService),
    ),
    methods: ["GET", "POST"],
    route: "lollipop-check/test",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
