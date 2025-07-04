import { AzureFunction, Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  RC_CONFIGURATION_COLLECTION_NAME,
  RCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { ulidGeneratorAsUlid } from "@pagopa/io-functions-commons/dist/src/utils/strings";
import * as express from "express";

import { remoteContentCosmosDbInstance } from "../../utils/cosmosdb";
import { getCreateRCConfigurationExpressHandler } from "./handler";

const rccModel = new RCConfigurationModel(
  remoteContentCosmosDbInstance.container(RC_CONFIGURATION_COLLECTION_NAME),
);

// Setup Express
const app = express();
secureExpressApp(app);

// Add express route
app.post(
  "/api/v1/remote-contents/configurations",
  getCreateRCConfigurationExpressHandler({
    generateConfigurationId: ulidGeneratorAsUlid,
    rccModel,
  }),
);

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
