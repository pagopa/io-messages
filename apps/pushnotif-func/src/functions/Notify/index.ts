import { AzureFunction, Context } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  PROFILE_COLLECTION_NAME,
  ProfileModel,
} from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  SERVICE_COLLECTION_NAME,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  AbortableFetch,
  setFetchTimeout,
  toFetch,
} from "@pagopa/ts-commons/lib/fetch";
import { Millisecond } from "@pagopa/ts-commons/lib/units";
import { createBlobService } from "azure-storage";
import * as express from "express";
import { pipe } from "fp-ts/lib/function";
import nodeFetch from "node-fetch";
import * as winston from "winston";

import { createClient } from "../../generated/session-manager/client";
import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { cosmosdbInstance } from "../../utils/cosmosdb";
import { Notify } from "./handler";
import { sendNotification } from "./notification";
import {
  getMessageWithContent,
  getService,
  getUserProfileReader,
  getUserSessionStatusReader,
} from "./readers";

const DEFAULT_REQUEST_TIMEOUT_MS = 10000 as Millisecond;

// Generic HTTP/HTTPS fetch with optional keepalive agent
// @see https://github.com/pagopa/io-ts-commons/blob/master/src/agent.ts#L10
const httpOrHttpsApiFetch = pipe(
  AbortableFetch(nodeFetch as unknown as typeof fetch),
  (abortableFetch) =>
    setFetchTimeout(DEFAULT_REQUEST_TIMEOUT_MS, abortableFetch),
  (fetchWithTimeout) => toFetch(fetchWithTimeout),
);

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

// Models
const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME,
);

const blobService = createBlobService(
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME),
);

const profileModel = new ProfileModel(
  cosmosdbInstance.container(PROFILE_COLLECTION_NAME),
);

const sessionManagerClient = createClient<"ApiKeyAuth">({
  baseUrl: config.SESSION_MANAGER_BASE_URL,
  fetchApi: httpOrHttpsApiFetch,
  withDefaults: (op) => (params) =>
    op({
      ...params,
      ApiKeyAuth: config.SESSION_MANAGER_API_KEY,
    }),
});

// Add express route
app.post(
  "/api/v1/notify",
  Notify(
    getUserProfileReader(profileModel),
    getUserSessionStatusReader(sessionManagerClient),
    getMessageWithContent(messageModel, blobService),
    getService(serviceModel),
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
