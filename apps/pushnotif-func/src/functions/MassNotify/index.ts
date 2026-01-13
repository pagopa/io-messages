import { AzureFunction, Context } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";
import * as winston from "winston";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { MassNotify } from "./handler";
import { sendNotification } from "./notification";

// Get config
const config = getConfigOrThrow();

let logger: Context["log"] | undefined;
const contextTransport = new AzureContextTransport(() => logger, {
  level: "debug",
});
winston.add(contextTransport);

// Setup Express
const app = express();
secureExpressApp(app);

const telemetryClient = initTelemetryClient(config);

// Add express route
app.post(
  "/api/v1/mass-notify",
  MassNotify(
    sendNotification(
      new QueueClient(
        config.NOTIFICATIONS_STORAGE_CONNECTION_STRING,
        config.NOTIFICATIONS_QUEUE_NAME,
      ),
    ),
    telemetryClient,
  ),
);

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  logger = context.log;

  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
