import * as express from "express";

import { AzureFunction, Context } from "@azure/functions";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import {
  RCConfigurationModel,
  RC_CONFIGURATION_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  UserRCConfigurationModel,
  USER_RC_CONFIGURATIONS_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { remoteContentCosmosDbInstance } from "../utils/cosmosdb";
import { listRCConfigurationExpressHandler } from "./handler";

const rcConfigurationModel = new RCConfigurationModel(
  remoteContentCosmosDbInstance.container(RC_CONFIGURATION_COLLECTION_NAME)
);

const userRCConfigurationModel = new UserRCConfigurationModel(
  remoteContentCosmosDbInstance.container(
    USER_RC_CONFIGURATIONS_COLLECTION_NAME
  )
);

// Setup Express
const app = express();
secureExpressApp(app);

// Add express route
app.get(
  "/api/v1/remote-contents/configurations",
  listRCConfigurationExpressHandler({
    rcConfigurationModel,
    userRCConfigurationModel
  })
);

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
