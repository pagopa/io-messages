import { AzureFunction, Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";

import {
  cosmosdbClient,
  remoteContentCosmosDbClient,
} from "../../utils/cosmosdb";
import { Info } from "./handler";

// Setup Express
const app = express();
secureExpressApp(app);

// Add express route
app.get("/api/v1/info", Info(cosmosdbClient, remoteContentCosmosDbClient));

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  azureFunctionHandler(context);
};

export default httpStart;
