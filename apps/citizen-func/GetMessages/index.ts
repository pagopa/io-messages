import { Context } from "@azure/functions";
import { createBlobService } from "azure-storage";

import * as express from "express";

import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";

import {
  MESSAGE_COLLECTION_NAME,
  MessageModel
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { MESSAGE_STATUS_COLLECTION_NAME } from "@pagopa/io-functions-commons/dist/src/models/message_status";

import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";

import {
  ServiceModel,
  SERVICE_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { MESSAGE_VIEW_COLLECTION_NAME } from "@pagopa/io-functions-commons/dist/src/models/message_view";
import {
  RCConfigurationModel,
  RC_CONFIGURATION_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  cosmosdbInstance,
  remoteContentCosmosdbInstance
} from "../utils/cosmosdb";
import { getConfigOrThrow } from "../utils/config";
import { MessageStatusExtendedQueryModel } from "../model/message_status_query";
import { MessageViewExtendedQueryModel } from "../model/message_view_query";
import { initTelemetryClient } from "../utils/appinsights";
import { getThirdPartyDataWithCategoryFetcher } from "../utils/messages";
import RCConfigurationUtility from "../utils/remoteContentConfig";
import { GetMessages } from "./handler";
import { createGetMessagesFunctionSelection } from "./getMessagesFunctions/getMessages.selector";
import { RedisClientFactory } from "../utils/redis";

// Setup Express
const app = express();
secureExpressApp(app);

const config = getConfigOrThrow();

const redisClientFactory = new RedisClientFactory(config);

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME
);
const messageStatusModel = new MessageStatusExtendedQueryModel(
  cosmosdbInstance.container(MESSAGE_STATUS_COLLECTION_NAME)
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME)
);

const messageViewModel = new MessageViewExtendedQueryModel(
  cosmosdbInstance.container(MESSAGE_VIEW_COLLECTION_NAME)
);

const rcConfigurationModel = new RCConfigurationModel(
  remoteContentCosmosdbInstance.container(RC_CONFIGURATION_COLLECTION_NAME)
);

const rcConfigurationUtility = new RCConfigurationUtility(
  redisClientFactory,
  rcConfigurationModel,
  config.SERVICE_CACHE_TTL_DURATION,
  config.SERVICE_TO_RC_CONFIGURATION_MAP
);

const blobService = createBlobService(
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING
);

const telemetryClient = initTelemetryClient();
const categoryFecther = getThirdPartyDataWithCategoryFetcher(
  config,
  telemetryClient
);

const getMessagesFunctionSelector = createGetMessagesFunctionSelection(
  config.USE_FALLBACK,
  config.FF_TYPE,
  config.FF_BETA_TESTER_LIST,
  config.FF_CANARY_USERS_REGEX,
  [
    messageModel,
    messageStatusModel,
    blobService,
    rcConfigurationUtility,
    categoryFecther
  ],
  [messageViewModel, rcConfigurationUtility, categoryFecther]
);

app.get(
  "/api/v1/messages/:fiscalcode",
  GetMessages(
    getMessagesFunctionSelector,
    serviceModel,
    redisClientFactory,
    config.SERVICE_CACHE_TTL_DURATION
  )
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function httpStart(context: Context): void {
  setAppContext(app, context);
  azureFunctionHandler(context);
}

export default httpStart;
