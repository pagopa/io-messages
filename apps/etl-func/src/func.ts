import { app } from "@azure/functions";
import { BlobMessageContent } from "./adapters/blob-storage/message-content.js";
import { Config, loadConfigFromEnvironment } from "./adapters/config.js";
import { extractMessageUseCase } from "./use-cases/extract-message.js";
import { MessageMetadata } from "./domain/message-metadata/schema.js";

async function main(config: Config) {
  const blobMessageContent = new BlobMessageContent(
    config.messageContentStorage.accountUri,
    config.messageContentStorage.containerName,
  );

  app.http("Health", {
    authLevel: "anonymous",
    handler: () => ({
      body: "it works!",
    }),
    methods: ["GET"],
    route: "health",
  });

  // NOTE: this snippet is for test only purpose, remove this before merge.
  app.http("ExtractMessage", {
    authLevel: "anonymous",
    handler: () => {
      extractMessageUseCase(blobMessageContent, {} as MessageMetadata);
      return {
        body: "it works!",
      };
    },
    methods: ["GET"],
    route: "extract",
  });
}

await loadConfigFromEnvironment(main);
