export const envConfig = {
  APPINSIGHTS_INSTRUMENTATIONKEY: "Idontknow",
  APPINSIGHTS_SAMPLING_PERCENTAGE: "20",

  AZURE_NH_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",

  AZURE_NH_HUB_NAME: "io-notification-hub-mock",

  NH_PARTITION_FEATURE_FLAG: "all",

  NH1_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  NH1_NAME: "NH1",
  NH1_PARTITION_REGEX: "^[0-3]",

  NH2_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  NH2_NAME: "NH2",
  NH2_PARTITION_REGEX: "^[4-7]",

  NH3_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  NH3_NAME: "NH3",
  NH3_PARTITION_REGEX: "^[8-b]",

  NH4_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  NH4_NAME: "NH4",
  NH4_PARTITION_REGEX: "^[c-f]",
  NOTIFICATIONS_QUEUE_NAME: "notification-queue-name",
  NOTIFICATIONS_STORAGE_CONNECTION_STRING:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  NOTIFY_MESSAGE_QUEUE_NAME: "notify-queue-name",
  RETRY_ATTEMPT_NUMBER: "1",

  MESSAGE_CONTAINER_NAME: "MessageContainerNane",
  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING:
    "MessageContentStorageConnectionString",

  SESSION_MANAGER_API_KEY: "SessionManagerAPIKey",
  SESSION_MANAGER_BASE_URL: "SessionManageBaseUrl",

  COSMOSDB_NAME: "CosmosDBName",
  COSMOSDB_URI: "CosmosDBUri",
  REMOTE_CONTENT_COSMOSDB_URI: "RemoteContentCosmosDBUri",
  REMOTE_CONTENT_COSMOSDB_NAME: "RemoteContentCosmosDBName",
};
