import { CosmosClient } from "@azure/cosmos";
import { app, output } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { QueueClient } from "@azure/storage-queue";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  PROFILE_COLLECTION_NAME,
  ProfileModel,
} from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  SERVICE_COLLECTION_NAME,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  AbortableFetch,
  setFetchTimeout,
  toFetch,
} from "@pagopa/ts-commons/lib/fetch";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { Millisecond } from "@pagopa/ts-commons/lib/units";
import { createBlobService } from "azure-storage";
import * as df from "durable-functions";
import { RetryOptions } from "durable-functions";
import { pipe } from "fp-ts/lib/function";
import nodeFetch from "node-fetch";

import { TelemetryClient } from "./adapters/appinsights";
import { blobServiceHealthcheck } from "./adapters/blob-service/health";
import {
  Config,
  configFromEnvironment,
  loadConfigFromEnvironment,
} from "./adapters/config";
import { cosmosHealthcheck } from "./adapters/cosmos/health";
import { CosmosInstallationSummaryAdapter } from "./adapters/cosmos/installation";
import { CosmosMassiveJobsAdapter } from "./adapters/cosmos/massive-jobs";
import { CosmosMassiveProgressAdapter } from "./adapters/cosmos/massive-progress";
import { createMassiveNotificationJobHandler } from "./adapters/functions/create-massive-notification-job";
import { getGetMassiveNotificationJobHandler } from "./adapters/functions/get-massive-notification-job";
import { getHealthHandler } from "./adapters/functions/health";
import { getInfoHandler } from "./adapters/functions/info";
import { startMassiveNotificationJobHandler } from "./adapters/functions/start-massive-notification-job";
import getUpdateInstallationHandler from "./adapters/functions/update-installation";
import getInstallationUpdateDispatcher from "./adapters/functions/update-installation-dispatch";
import { notificationHubHealthcheck } from "./adapters/notification-hub/health";
import { NotificationHubInstallationAdapter } from "./adapters/notification-hub/installation";
import { CheckJobMessageQueueAdapter } from "./adapters/storage-queue/check-job-message";
import { SendNotificationQueueAdapter } from "./adapters/storage-queue/send-notification";
import { CreateMassiveNotificationJobUseCase } from "./domain/use-cases/create-massive-notification-job";
import { GetMassiveNotificationJobUseCase } from "./domain/use-cases/get-massive-notification-job";
import { HealthCheckUseCase } from "./domain/use-cases/health";
import { InfoUseCase } from "./domain/use-cases/info";
import { StartMassiveNotificationJobUseCase } from "./domain/use-cases/start-massive-notification-job";
import {
  ActivityName as CreateOrUpdateActivityName,
  getActivityHandler as getCreateOrUpdateActivityHandler,
  getCallableActivity as getCreateOrUpdateCallableActivity,
} from "./functions/handle-nh-create-or-update-installation-call-activity";
import { getHandler as getCreateOrUpdateOrchestratorHandler } from "./functions/handle-nh-create-or-update-installation-call-orchestrator";
import {
  ActivityName as DeleteActivityName,
  getActivityHandler as getDeleteActivityHandler,
  getCallableActivity as getDeleteCallableActivity,
} from "./functions/handle-nh-delete-installation-call-activity";
import { getHandler as getDeleteOrchestratorHandler } from "./functions/handle-nh-delete-installation-call-orchestrator";
import { getHandler as getNotificationCallHandler } from "./functions/handle-nh-notification-call";
import { handle as handleNotifyMessage } from "./functions/handle-nh-notify-message-call-activity-queue";
import { Notify } from "./functions/notify";
import { createClient } from "./generated/session-manager/client";
import { sendNotification } from "./services/notification";
import {
  getMessageWithContent,
  getService,
  getUserProfileReader,
  getUserSessionStatusReader,
} from "./services/readers";
import { initTelemetryClient } from "./utils/appinsights";
import { NotificationHubPartitionFactory } from "./utils/notificationhub-service-partition";

// eslint-disable-next-line max-lines-per-function
const main = (config: Config) => {
  // Generic HTTP/HTTPS fetch with optional keepalive agent
  // @see https://github.com/pagopa/io-ts-commons/blob/master/src/agent.ts#L10
  const httpOrHttpsApiFetch = pipe(
    AbortableFetch(nodeFetch as unknown as typeof fetch),
    (abortableFetch) => setFetchTimeout(10000 as Millisecond, abortableFetch),
    (fetchWithTimeout) => toFetch(fetchWithTimeout),
  );

  const telemetryClient = initTelemetryClient(config);

  const aadCredentials = new DefaultAzureCredential();

  const apiCosmosdb = new CosmosClient({
    aadCredentials,
    endpoint: config.apiCosmos.accountEndpoint,
  }).database(config.apiCosmos.databaseName);

  const pushCosmosDb = new CosmosClient({
    aadCredentials,
    endpoint: config.comCosmos.accountEndpoint,
  }).database(config.comCosmos.pushDatabaseName);

  const retryOptions = new RetryOptions(5000, 10);
  retryOptions.backoffCoefficient = 1.5;

  const comCosmosInstallationSummaryAdapter =
    new CosmosInstallationSummaryAdapter(
      pushCosmosDb,
      config.installationSummariesContainerName,
    );

  const messageModel = new MessageModel(
    apiCosmosdb.container(MESSAGE_COLLECTION_NAME),
    config.messageContentContainerName as NonEmptyString,
  );

  const blobService = createBlobService(
    config.apiStorageAccountConnectionString,
  );

  const serviceModel = new ServiceModel(
    apiCosmosdb.container(SERVICE_COLLECTION_NAME),
  );

  const profileModel = new ProfileModel(
    apiCosmosdb.container(PROFILE_COLLECTION_NAME),
  );

  const sessionManagerClient = createClient<"ApiKeyAuth">({
    baseUrl: config.sessionManager.baseUrl,
    fetchApi: httpOrHttpsApiFetch,
    withDefaults: (op) => (params) =>
      op({
        ...params,
        ApiKeyAuth: config.sessionManager.apiKey,
      }),
  });

  const notifyQueueClient = new QueueClient(
    config.comStorageConnectionString,
    "push-notifications",
  );
  const checkJobMessageQueue = new QueueClient(
    config.comStorageConnectionString,
    "check-job-messages",
  );
  const sendNotificationMessageQueue = new QueueClient(
    config.comStorageConnectionString,
    "send-notification-messages",
  );

  // TODO: This factory breaks clean architecture, remove this in future.
  const nhPartitionFactory = new NotificationHubPartitionFactory([
    config.notificationHub.partition1,
    config.notificationHub.partition2,
    config.notificationHub.partition3,
    config.notificationHub.partition4,
  ]);

  const notificationHubClients = [
    new NotificationHubsClient(
      config.notificationHub.partition1.endpoint,
      config.notificationHub.partition1.name,
    ),

    new NotificationHubsClient(
      config.notificationHub.partition2.endpoint,
      config.notificationHub.partition2.name,
    ),

    new NotificationHubsClient(
      config.notificationHub.partition3.endpoint,
      config.notificationHub.partition3.name,
    ),

    new NotificationHubsClient(
      config.notificationHub.partition4.endpoint,
      config.notificationHub.partition4.name,
    ),
  ];

  const telemetryService = new TelemetryClient(telemetryClient);
  const updateInstallationDispatchQueueName = "update-installations-dispatch";

  const notifiationHubInstallationAdapter =
    new NotificationHubInstallationAdapter(notificationHubClients, [
      new RegExp(config.notificationHub.partition1.partitionRegex),
      new RegExp(config.notificationHub.partition2.partitionRegex),
      new RegExp(config.notificationHub.partition3.partitionRegex),
      new RegExp(config.notificationHub.partition4.partitionRegex),
    ]);

  const updateInstallationDispatchQueueOutput = output.storageQueue({
    connection: "NOTIFICATIONS_STORAGE_CONNECTION_STRING",
    queueName: updateInstallationDispatchQueueName,
  });

  const infoUseCase = new InfoUseCase();
  app.http("Info", {
    authLevel: "anonymous",
    handler: getInfoHandler(infoUseCase),
    methods: ["GET"],
    route: "api/v1/info",
  });

  const healthChecks = [
    () => cosmosHealthcheck(apiCosmosdb),
    () => cosmosHealthcheck(pushCosmosDb),
    () => blobServiceHealthcheck(blobService),
    ...notificationHubClients.map(
      (client, i) => () => notificationHubHealthcheck(client, i + 1),
    ),
  ];
  const healthCheckUseCase = new HealthCheckUseCase(healthChecks);
  app.http("Health", {
    authLevel: "anonymous",
    handler: getHealthHandler(healthCheckUseCase),
    methods: ["GET"],
    route: "api/v1/health",
  });

  df.app.orchestration(
    "HandleNHCreateOrUpdateInstallationCallOrchestrator",
    getCreateOrUpdateOrchestratorHandler({
      createOrUpdateActivity: getCreateOrUpdateCallableActivity(retryOptions),
    }),
  );

  const notifyQueueOutput = output.storageQueue({
    connection: "NOTIFICATIONS_STORAGE_CONNECTION_STRING",
    queueName: "notify-messages",
  });

  app.storageQueue("HandleNHNotificationCall", {
    connection: "NOTIFICATIONS_STORAGE_CONNECTION_STRING",
    extraInputs: [df.input.durableClient()],
    extraOutputs: [notifyQueueOutput],
    handler: getNotificationCallHandler(notifyQueueOutput),
    queueName: "push-notifications",
  });

  app.storageQueue("HandleNHNotifyMessageCallActivityQueue", {
    connection: "NOTIFICATIONS_STORAGE_CONNECTION_STRING",
    handler: (notifyRequest) =>
      handleNotifyMessage(notifyRequest, telemetryClient, nhPartitionFactory),
    queueName: "notify-messages",
  });

  app.http("Notify", {
    authLevel: "function",
    handler: Notify(
      getUserProfileReader(profileModel),
      getUserSessionStatusReader(sessionManagerClient),
      getMessageWithContent(messageModel, blobService),
      getService(serviceModel),
      sendNotification(notifyQueueClient),
      telemetryClient,
    ),
    methods: ["POST"],
    route: "api/v1/notify",
  });

  df.app.activity(CreateOrUpdateActivityName, {
    handler: getCreateOrUpdateActivityHandler(
      nhPartitionFactory,
      telemetryClient,
      comCosmosInstallationSummaryAdapter,
    ),
  });

  df.app.activity(DeleteActivityName, {
    handler: getDeleteActivityHandler(
      nhPartitionFactory,
      telemetryClient,
      comCosmosInstallationSummaryAdapter,
    ),
  });

  df.app.orchestration(
    "HandleNHDeleteInstallationCallOrchestrator",
    getDeleteOrchestratorHandler({
      deleteInstallationActivity: getDeleteCallableActivity(retryOptions),
    }),
  );

  app.cosmosDB("InstallationUpdateDispatcher", {
    connection: "COM_COSMOS",
    containerName: config.installationSummariesContainerName,
    createLeaseContainerIfNotExists: false,
    databaseName: config.databaseName,
    extraOutputs: [updateInstallationDispatchQueueOutput],
    handler: getInstallationUpdateDispatcher(
      telemetryService,
      config.updateAllInstallationsTimeToReach,
      updateInstallationDispatchQueueOutput,
    ),
    leaseContainerName: "installation-summaries-leases",
    leaseContainerPrefix: config.installationSummariesLeaseContainerPrefix,
    maxItemsPerInvocation: 50,
    retry: {
      maxRetryCount: 5,
      maximumInterval: {
        minutes: 30,
      },
      minimumInterval: {
        minutes: 1,
      },
      strategy: "exponentialBackoff",
    },
    startFromBeginning: true,
  });

  app.storageQueue("UpdateInstallation", {
    connection: "NOTIFICATIONS_STORAGE_CONNECTION_STRING",
    handler: getUpdateInstallationHandler(
      telemetryService,
      notifiationHubInstallationAdapter,
    ),
    queueName: updateInstallationDispatchQueueName,
  });

  const massiveJobsContainer = pushCosmosDb.container(
    config.massiveJobsContainerName,
  );
  const massiveJobsRepository = new CosmosMassiveJobsAdapter(
    massiveJobsContainer,
  );
  const createMassiveNotificationJobUseCase =
    new CreateMassiveNotificationJobUseCase(massiveJobsRepository);

  const massiveProgressContainer = pushCosmosDb.container(
    config.massiveProgressContainerName,
  );
  const massiveProgressRepository = new CosmosMassiveProgressAdapter(
    massiveProgressContainer,
  );
  const getMassiveNotificationJobUseCase = new GetMassiveNotificationJobUseCase(
    massiveJobsRepository,
    massiveProgressRepository,
  );
  const checkJobMessageQueueAdapter = new CheckJobMessageQueueAdapter(
    checkJobMessageQueue,
  );
  const sendNotificationQueueAdapter = new SendNotificationQueueAdapter(
    sendNotificationMessageQueue,
  );
  const startMassiveNotificationJobUseCase =
    new StartMassiveNotificationJobUseCase(
      massiveJobsRepository,
      checkJobMessageQueueAdapter,
      sendNotificationQueueAdapter,
      telemetryClient,
    );

  app.http("CreateMassiveNotificationJob", {
    authLevel: "admin",
    handler: createMassiveNotificationJobHandler(
      createMassiveNotificationJobUseCase,
    ),
    methods: ["POST"],
    route: "api/v1/massive-notification-job",
  });

  app.http("StartMassiveNotificationJob", {
    authLevel: "admin",
    handler: startMassiveNotificationJobHandler(
      startMassiveNotificationJobUseCase,
    ),
    methods: ["POST"],
    route: "api/v1/massive-notification-job/{id}",
  });

  app.http("GetMassiveNotificationJob", {
    authLevel: "admin",
    handler: getGetMassiveNotificationJobHandler(
      getMassiveNotificationJobUseCase,
    ),
    methods: ["GET"],
    route: "api/v1/massive-notification-job/{id}",
  });
};

loadConfigFromEnvironment(main, configFromEnvironment);
