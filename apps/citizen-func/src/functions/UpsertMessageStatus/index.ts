import { Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  MESSAGE_STATUS_COLLECTION_NAME,
  MessageStatusModel,
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";

import { cosmosdbInstance } from "../../utils/cosmosdb";
import { UpsertMessageStatus } from "./handler";

// Setup Express
const app = express();
secureExpressApp(app);

const messageStatusModel = new MessageStatusModel(
  cosmosdbInstance.container(MESSAGE_STATUS_COLLECTION_NAME),
);

app.put(
  "/api/v1/messages/:fiscalcode/:id/message-status",
  UpsertMessageStatus(messageStatusModel),
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler
function httpStart(context: Context): void {
  setAppContext(app, context);
  azureFunctionHandler(context);
}

export default httpStart;
