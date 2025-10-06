export const envConfig = {
  APPINSIGHTS_INSTRUMENTATIONKEY: "Idontknow",
  APPINSIGHTS_SAMPLING_PERCENTAGE: "20",

  COSMOSDB_NAME: "CosmosDBName",

  COSMOSDB_URI: "CosmosDBUri",
  LEGACY_NH1_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  LEGACY_NH1_NAME: "NH1",

  LEGACY_NH1_PARTITION_REGEX: "^[0-3]",
  LEGACY_NH2_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  LEGACY_NH2_NAME: "NH2",

  LEGACY_NH2_PARTITION_REGEX: "^[4-7]",
  LEGACY_NH3_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  LEGACY_NH3_NAME: "NH3",

  LEGACY_NH3_PARTITION_REGEX: "^[8-b]",
  LEGACY_NH4_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  LEGACY_NH4_NAME: "NH4",
  LEGACY_NH4_PARTITION_REGEX: "^[c-f]",
  MESSAGE_CONTAINER_NAME: "MessageContainerNane",
  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING:
    "MessageContentStorageConnectionString",
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
  SESSION_MANAGER_API_KEY: "SessionManagerAPIKey",
  SESSION_MANAGER_BASE_URL: "SessionManageBaseUrl",
};
