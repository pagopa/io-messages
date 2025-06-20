import { Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  SERVICE_COLLECTION_NAME,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
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

import { createClient } from "../../generated/remote-content/client.js";
import { initTelemetryClient } from "../../utils/appinsights.js";
import { getConfigOrThrow } from "../../utils/config.js";
import { cosmosdbInstance } from "../../utils/cosmosdb.js";
import { CreateMessage } from "./handler";
import { makeUpsertBlobFromObject } from "./utils";

const config = getConfigOrThrow();

// Setup Express
const app = express();
secureExpressApp(app);

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME,
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME),
);

const blobService = createBlobService(
  config.INTERNAL_STORAGE_CONNECTION_STRING,
);

const telemetryClient = initTelemetryClient(config);

const DEFAULT_REQUEST_TIMEOUT_MS = 10000 as Millisecond;

const httpOrHttpsApiFetch = pipe(
  AbortableFetch(fetch),
  (abortableFetch) =>
    setFetchTimeout(DEFAULT_REQUEST_TIMEOUT_MS, abortableFetch),
  (fetchWithTimeout) => toFetch(fetchWithTimeout),
);

//TODO: check auth method
const remoteContentClient = createClient<"ApiKeyAuth">({
  baseUrl: config.SENDING_FUNC_API_URL,
  fetchApi: httpOrHttpsApiFetch,
  withDefaults: (op) => (params) =>
    op({
      ...params,
      ApiKeyAuth: config.SENDING_FUNC_API_KEY,
    }),
});

app.post(
  "/api/v1/messages/:fiscalcode?",
  CreateMessage(
    telemetryClient,
    remoteContentClient,
    serviceModel,
    messageModel,
    makeUpsertBlobFromObject(
      blobService,
      config.PROCESSING_MESSAGE_CONTAINER_NAME,
    ),
    config.FF_DISABLE_INCOMPLETE_SERVICES,
    config.FF_INCOMPLETE_SERVICE_WHITELIST,
    config.SANDBOX_FISCAL_CODE,
  ),
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler
function httpStart(context: Context): void {
  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
}

export default httpStart;
