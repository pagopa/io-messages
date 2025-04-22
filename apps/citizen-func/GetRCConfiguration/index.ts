import { Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  RC_CONFIGURATION_COLLECTION_NAME,
  RCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";

import { getConfigOrThrow } from "../utils/config";
import { remoteContentCosmosdbInstance } from "../utils/cosmosdb";
import { RedisClientFactory } from "../utils/redis";
import RCConfigurationUtility from "../utils/remoteContentConfig";
import { GetRCConfiguration } from "./handler";

// Setup Express
const app = express();
secureExpressApp(app);

const config = getConfigOrThrow();

const redisClientFactory = new RedisClientFactory(config);

const rcConfigurationModel = new RCConfigurationModel(
  remoteContentCosmosdbInstance.container(RC_CONFIGURATION_COLLECTION_NAME),
);

const rcConfigurationUtility = new RCConfigurationUtility(
  redisClientFactory,
  rcConfigurationModel,
  config.SERVICE_CACHE_TTL_DURATION,
  config.SERVICE_TO_RC_CONFIGURATION_MAP,
);

app.get(
  "/api/v1/remote-contents/configurations/:id",
  GetRCConfiguration(rcConfigurationUtility),
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler

function httpStart(context: Context): void {
  setAppContext(app, context);
  azureFunctionHandler(context);
}

export default httpStart;
