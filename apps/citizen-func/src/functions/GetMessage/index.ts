import { Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  MESSAGE_STATUS_COLLECTION_NAME,
  MessageStatusModel,
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import {
  SERVICE_COLLECTION_NAME,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { createBlobService } from "azure-storage";
import * as express from "express";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { cosmosdbInstance } from "../../utils/cosmosdb";
import { getThirdPartyDataWithCategoryFetcher } from "../../utils/messages";
import { RedisClientFactory } from "../../utils/redis";
import { GetMessage } from "./handler";

// Setup Express
const app = express();
secureExpressApp(app);

const config = getConfigOrThrow();

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME,
);

const messageStatusModel = new MessageStatusModel(
  cosmosdbInstance.container(MESSAGE_STATUS_COLLECTION_NAME),
);

const blobService = createBlobService(
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME),
);

const redisClientFactory = new RedisClientFactory(config);

const telemetryClient = initTelemetryClient();

app.get(
  "/api/v1/messages/:fiscalcode/:id",
  GetMessage(
    messageModel,
    messageStatusModel,
    blobService,
    serviceModel,
    redisClientFactory,
    config.SERVICE_CACHE_TTL_DURATION,
    config.SERVICE_TO_RC_CONFIGURATION_MAP,
    getThirdPartyDataWithCategoryFetcher(config, telemetryClient),
  ),
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler

function httpStart(context: Context): void {
  setAppContext(app, context);
  azureFunctionHandler(context);
}

export default httpStart;
