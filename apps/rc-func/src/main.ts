import { CosmosDBHandler, InvocationContext, app } from "@azure/functions";
import {
  RC_CONFIGURATION_COLLECTION_NAME,
  RCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  USER_RC_CONFIGURATIONS_COLLECTION_NAME,
  UserRCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { ulidGeneratorAsUlid } from "@pagopa/io-functions-commons/dist/src/utils/strings";

import { handleRemoteContentMessageConfigurationChange } from "./functions/CosmosRemoteContentMessageConfigurationChangeFeed/handler";
import { getCreateRCConfigurationHandler } from "./functions/CreateRCConfiguration/handler";
import { getRCConfigurationHandler } from "./functions/GetRCConfiguration/handler";
import { getInfoHandler } from "./functions/Info/handler";
import { getListRCConfigurationHandler } from "./functions/ListRCConfiguration/handler";
import { getUpdateRCConfigurationHandlerV4 } from "./functions/UpdateRCConfiguration/handler";
import { initTelemetryClient } from "./utils/appinsights";
import { getConfigOrThrow } from "./utils/config";
import {
  cosmosdbClient,
  remoteContentCosmosDbClient,
  remoteContentCosmosDbInstance,
} from "./utils/cosmosdb";
import { RedisClientFactory } from "./utils/redis";

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

const rccModel = new RCConfigurationModel(
  remoteContentCosmosDbInstance.container(RC_CONFIGURATION_COLLECTION_NAME),
);

const userRCConfigurationModel = new UserRCConfigurationModel(
  remoteContentCosmosDbInstance.container(
    USER_RC_CONFIGURATIONS_COLLECTION_NAME,
  ),
);

const redisClientFactory = new RedisClientFactory(config);

app.http("Info", {
  authLevel: "anonymous",
  handler: getInfoHandler(cosmosdbClient, remoteContentCosmosDbClient),
  methods: ["GET"],
  route: "v1/info",
});

app.http("CreateRCConfiguration", {
  authLevel: "function",
  handler: getCreateRCConfigurationHandler({
    generateConfigurationId: ulidGeneratorAsUlid,
    rccModel,
  }),
  methods: ["POST"],
  route: "v1/remote-contents/configurations",
});

app.http("GetRCConfiguration", {
  authLevel: "function",
  handler: getRCConfigurationHandler({
    config,
    rccModel,
    redisClient: redisClientFactory,
  }),
  methods: ["GET"],
  route: "v1/remote-contents/configurations/{configurationId}",
});

app.http("ListRCConfiguration", {
  authLevel: "function",
  handler: getListRCConfigurationHandler({
    rcConfigurationModel: rccModel,
    userRCConfigurationModel,
  }),
  methods: ["GET"],
  route: "v1/remote-contents/configurations",
});

app.http("UpdateRCConfiguration", {
  authLevel: "function",
  handler: getUpdateRCConfigurationHandlerV4({
    config,
    rccModel,
    redisClientFactory,
    telemetryClient,
  }),
  methods: ["PUT"],
  route: "v1/remote-contents/configurations/{configurationId}",
});

const cosmosChangeFeedHandler: CosmosDBHandler = async (
  documents: unknown[],
  context: InvocationContext,
): Promise<void> => {
  await handleRemoteContentMessageConfigurationChange(
    context,
    userRCConfigurationModel,
    telemetryClient,
    0,
  )(documents);
};

app.cosmosDB("CosmosRemoteContentMessageConfigurationChangeFeed", {
  connection: "REMOTE_CONTENT_COSMOSDB",
  containerName: "message-configuration",
  createLeaseContainerIfNotExists: false,
  databaseName: "remote-content-cosmos-01",
  handler: cosmosChangeFeedHandler,
  leaseContainerName: "remote-content-leases",
  leaseContainerPrefix: "RemoteContentMessageConfigurationChangeFeed-00",
  retry: {
    delayInterval: 10000,
    maxRetryCount: -1,
    strategy: "fixedDelay",
  },
  startFromBeginning: true,
});
