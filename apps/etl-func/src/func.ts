import { app } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { AzureCliCredential } from "@azure/identity";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { Config, configFromEnvironment } from "./adapters/config.js";

const main = async (config: Config) => {
  const azureCredentials = new AzureCliCredential();
  const blobServiceCLient = new BlobServiceClient(
    config.messageContentStorage.accountUri,
    azureCredentials,
  );
  app.http("Health", {
    authLevel: "anonymous",
    handler: async () => {
      // check for storage availability or throw
      console.log("Checking for account info");
      await blobServiceCLient.getProperties();
      return {
        body: "it works!",
      };
    },
    methods: ["GET"],
    route: "health",
  });

};

await loadConfigFromEnvironment(main, configFromEnvironment);
