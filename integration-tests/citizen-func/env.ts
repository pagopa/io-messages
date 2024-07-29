export const AzureWebJobsStorage = process.env.AzureWebJobsStorage;
export const MESSAGE_CONTENT_STORAGE_CONNECTION_STRING = process.env.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING || "";

// Milliseconds to wait for test completion
export const WAIT_MS = Number(process.env.WAIT_MS ?? 5000);
export const SHOW_LOGS = process.env.SHOW_LOGS === "true";

export const COSMOSDB_URI = process.env.COSMOSDB_URI as string;
export const COSMOSDB_KEY = process.env.COSMOSDB_KEY as string;
export const COSMOSDB_NAME = process.env.COSMOSDB_NAME as string;

export const SERVICE_TO_RC_CONFIGURATION_MAP = process.env
  .SERVICE_TO_RC_CONFIGURATION_MAP as string;

export const REMOTE_CONTENT_COSMOSDB_URI = process.env.COSMOSDB_URI as string;
export const REMOTE_CONTENT_COSMOSDB_KEY = process.env.COSMOSDB_KEY as string;
export const REMOTE_CONTENT_COSMOSDB_NAME = "remote-content";

export const FF_TYPE = process.env.FF_TYPE;

export const MESSAGE_CONTAINER_NAME = process.env
  .MESSAGE_CONTAINER_NAME as string;

export const PN_SERVICE_ID = process.env.PN_SERVICE_ID;
