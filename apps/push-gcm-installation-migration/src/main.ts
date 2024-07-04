import { InvocationContext, app } from "@azure/functions";

import { configSchema } from "./adapters/config.js";

export const config = configSchema.parse({
  notificationHub: {
    partition1: {
      connectionString: process.env.NH1_CONNECTION_STRING,
      name: process.env.NH1_NAME,
    },
    partition2: {
      connectionString: process.env.NH2_CONNECTION_STRING,
      name: process.env.NH2_NAME,
    },
    partition3: {
      connectionString: process.env.NH3_CONNECTION_STRING,
      name: process.env.NH3_NAME,
    },
    partition4: {
      connectionString: process.env.NH4_CONNECTION_STRING,
      name: process.env.NH4_NAME,
    },
  },
  storage: {
    gcmMigration: { containerName: process.env.GCM_MIGRATION_CONTAINER_NAME },
  },
});

export type Config = typeof config;

app.http("Health", {
  authLevel: "anonymous",
  handler: () => ({ body: "it works" }),
  methods: ["GET"],
  route: "health",
});

export const migrateGcmToFcmV1Handler = async (
  input: unknown,
  context: InvocationContext,
): Promise<void> => {
  //TODO: Implement business logic
  context.log(input);
};

app.storageBlob("MigrateGcmToFcmV1", {
  connection: "AzureWebJobsStorage",
  handler: migrateGcmToFcmV1Handler,
  path: config.storage.gcmMigration.containerName,
});
