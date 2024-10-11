import { app } from "@azure/functions";
import { BlobMessageContent } from "./adapters/blob-storage/message-content.js";
import { Config, loadConfigFromEnvironment } from "./adapters/config.js";
import { ExtractMessageUseCase } from "./use-cases/extract-message.js";
import { MessageMetadata } from "./domain/entities/message-metadata.js";

async function main(config: Config) {
  const blobMessageContent = new BlobMessageContent(
    config.messageContentStorage.accountUri,
    config.messageContentStorage.containerName,
  );

  const extractMessageUseCase = new ExtractMessageUseCase(
    {
      id: "01EHA1R1TSJP8DNYYG2TTR1B28",
    } as MessageMetadata,
    blobMessageContent,
    config.sendServiceId,
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
    handler: async () => {
      await extractMessageUseCase.execute();
      return {
        body: "it works!",
      };
    },
    methods: ["GET"],
    route: "extract",
  });
}

await loadConfigFromEnvironment(main);
