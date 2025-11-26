import { TableClient } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

import { Config } from "../config.js";

// Return the correct TableClient based on the environment.
// If the environment is not "production" we use a local docker azurite
// container.
export const makeTableStorageAccountClient = (
  config: Config,
  credentials: DefaultAzureCredential,
): TableClient =>
  config.environment === "production"
    ? new TableClient(
        `${config.messageIngestionErrorTable.connectionUri}${config.messageIngestionErrorTable.tableName}`,
        config.messageIngestionErrorTable.tableName,
        credentials,
      )
    : TableClient.fromConnectionString(
        config.messageIngestionErrorTable.connectionString,
        config.messageIngestionErrorTable.tableName,
        // we use http locally
        { allowInsecureConnection: true },
      );
