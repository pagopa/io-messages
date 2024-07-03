import { InvocationContext, app } from "@azure/functions";
import { configSchema } from "./config.js";

const config = configSchema.parse({
  storage: {
    gcmMigration: { containerName: process.env.GCM_MIGRATION_CONTAINER_NAME },
  },
});

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
  const stringInput = new String(input);
  context.log(stringInput);
};

app.storageBlob("MigrateGcmToFcmV1", {
  path: config.storage.gcmMigration.containerName,
  connection: "AzureWebJobsStorage",
  handler: migrateGcmToFcmV1Handler,
});
