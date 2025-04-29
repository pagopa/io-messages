import { AzureFunction, Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  RC_CONFIGURATION_COLLECTION_NAME,
  RCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";

import { getConfigOrThrow } from "../utils/config";
import { remoteContentCosmosDbInstance } from "../utils/cosmosdb";
import { RedisClientFactory } from "../utils/redis";
import { getGetRCConfigurationExpressHandler } from "./handler";

const rccModel = new RCConfigurationModel(
  remoteContentCosmosDbInstance.container(RC_CONFIGURATION_COLLECTION_NAME),
);

const config = getConfigOrThrow();

const redisClientFactory = new RedisClientFactory(config);

// Setup Express
const app = express();
secureExpressApp(app);

// Add express route
app.get(
  "/api/v1/remote-contents/configurations/:configurationId",
  getGetRCConfigurationExpressHandler({
    config,
    rccModel,
    redisClient: redisClientFactory,
  }),
);

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
