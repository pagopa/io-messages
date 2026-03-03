import { app } from "@azure/functions";
import { createBlobService } from "@pagopa/azure-storage-legacy-migration-kit";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  MESSAGE_STATUS_COLLECTION_NAME,
  MessageStatusModel,
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { MESSAGE_VIEW_COLLECTION_NAME } from "@pagopa/io-functions-commons/dist/src/models/message_view";
import {
  RC_CONFIGURATION_COLLECTION_NAME,
  RCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  SERVICE_COLLECTION_NAME,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";

import { GetMessage } from "./functions/GetMessage/handler";
import { createGetMessagesFunctionSelection } from "./functions/GetMessages/getMessagesFunctions/getMessages.selector";
import { GetMessages } from "./functions/GetMessages/handler";
import { GetRCConfiguration } from "./functions/GetRCConfiguration/handler";
import { Info } from "./functions/Info/handler";
import { UpsertMessageStatus } from "./functions/UpsertMessageStatus/handler";
import { MessageStatusExtendedQueryModel } from "./model/message_status_query";
import { MessageViewExtendedQueryModel } from "./model/message_view_query";
import { getConfigOrThrow } from "./utils/config";
import {
  cosmosdbClient,
  cosmosdbInstance,
  remoteContentCosmosdbClient,
  remoteContentCosmosdbInstance,
} from "./utils/cosmosdb";
import { getThirdPartyDataWithCategoryFetcher } from "./utils/messages";
import { RedisClientFactory } from "./utils/redis";
import RCConfigurationUtility from "./utils/remoteContentConfig";

const config = getConfigOrThrow();

const redisClientFactory = new RedisClientFactory(config);

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME,
);

// Plain MessageStatusModel used by UpsertMessageStatus
const messageStatusModel = new MessageStatusModel(
  cosmosdbInstance.container(MESSAGE_STATUS_COLLECTION_NAME),
);

// Extended query model used by GetMessages
const messageStatusExtendedModel = new MessageStatusExtendedQueryModel(
  cosmosdbInstance.container(MESSAGE_STATUS_COLLECTION_NAME),
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME),
);

const messageViewModel = new MessageViewExtendedQueryModel(
  cosmosdbInstance.container(MESSAGE_VIEW_COLLECTION_NAME),
);

const blobService = createBlobService(
  config.IO_COM_STORAGE_CONNECTION_STRING,
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
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

const categoryFetcher = getThirdPartyDataWithCategoryFetcher(config);

const getMessagesFunctionSelector = createGetMessagesFunctionSelection(
  config.USE_FALLBACK,
  config.FF_TYPE,
  config.FF_BETA_TESTER_LIST,
  config.FF_CANARY_USERS_REGEX,
  [
    messageModel,
    messageStatusExtendedModel,
    blobService,
    rcConfigurationUtility,
    categoryFetcher,
  ],
  [messageViewModel, rcConfigurationUtility, categoryFetcher],
);

app.http("Info", {
  authLevel: "anonymous",
  handler: Info(cosmosdbClient, remoteContentCosmosdbClient),
  methods: ["GET"],
  route: "v1/info",
});

app.http("GetMessage", {
  authLevel: "function",
  handler: GetMessage(
    messageModel,
    messageStatusModel,
    blobService,
    serviceModel,
    redisClientFactory,
    config.SERVICE_CACHE_TTL_DURATION,
    config.SERVICE_TO_RC_CONFIGURATION_MAP,
    categoryFetcher,
  ),
  methods: ["GET"],
  route: "v1/messages/{fiscalcode}/{id}",
});

app.http("GetMessages", {
  authLevel: "function",
  handler: GetMessages(
    getMessagesFunctionSelector,
    serviceModel,
    redisClientFactory,
    config.SERVICE_CACHE_TTL_DURATION,
  ),
  methods: ["GET"],
  route: "v1/messages/{fiscalcode}",
});

app.http("UpsertMessageStatus", {
  authLevel: "function",
  handler: UpsertMessageStatus(messageStatusModel),
  methods: ["PUT"],
  route: "v1/messages/{fiscalcode}/{id}/message-status",
});

app.http("GetRCConfiguration", {
  authLevel: "function",
  handler: GetRCConfiguration(rcConfigurationUtility),
  methods: ["GET"],
  route: "v1/remote-contents/configurations/{id}",
});
