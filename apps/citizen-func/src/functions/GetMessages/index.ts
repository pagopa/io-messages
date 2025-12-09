import { Context } from "@azure/functions";
import { createBlobService } from "@pagopa/azure-storage-legacy-migration-kit";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { MESSAGE_STATUS_COLLECTION_NAME } from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { MESSAGE_VIEW_COLLECTION_NAME } from "@pagopa/io-functions-commons/dist/src/models/message_view";
import {
  RC_CONFIGURATION_COLLECTION_NAME,
  RCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  SERVICE_COLLECTION_NAME,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";

import { MessageStatusExtendedQueryModel } from "../../model/message_status_query";
import { MessageViewExtendedQueryModel } from "../../model/message_view_query";
import { getConfigOrThrow } from "../../utils/config";
import {
  cosmosdbInstance,
  remoteContentCosmosdbInstance,
} from "../../utils/cosmosdb";
import { getThirdPartyDataWithCategoryFetcher } from "../../utils/messages";
import { RedisClientFactory } from "../../utils/redis";
import RCConfigurationUtility from "../../utils/remoteContentConfig";
import { createGetMessagesFunctionSelection } from "./getMessagesFunctions/getMessages.selector";
import { GetMessages } from "./handler";

// Setup Express
const app = express();
secureExpressApp(app);

const config = getConfigOrThrow();

const redisClientFactory = new RedisClientFactory(config);

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME,
);
const messageStatusModel = new MessageStatusExtendedQueryModel(
  cosmosdbInstance.container(MESSAGE_STATUS_COLLECTION_NAME),
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME),
);

const messageViewModel = new MessageViewExtendedQueryModel(
  cosmosdbInstance.container(MESSAGE_VIEW_COLLECTION_NAME),
);

const rcConfigurationModel = new RCConfigurationModel(
  remoteContentCosmosdbInstance.container(RC_CONFIGURATION_COLLECTION_NAME),
);

const rcConfigurationUtility = new RCConfigurationUtility(
  redisClientFactory,
  rcConfigurationModel,
  config.SERVICE_CACHE_TTL_DURATION,
  config.SERVICE_TO_RC_CONFIGURATION_MAP,
);

const blobService = createBlobService(
  config.IO_COM_STORAGE_CONNECTION_STRING,
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
);

const categoryFecther = getThirdPartyDataWithCategoryFetcher(config);

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
    categoryFecther,
  ],
  [messageViewModel, rcConfigurationUtility, categoryFecther],
);

app.get(
  "/api/v1/messages/:fiscalcode",
  GetMessages(
    getMessagesFunctionSelector,
    serviceModel,
    redisClientFactory,
    config.SERVICE_CACHE_TTL_DURATION,
  ),
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler

function httpStart(context: Context): void {
  setAppContext(app, context);
  azureFunctionHandler(context);
}

export default httpStart;
