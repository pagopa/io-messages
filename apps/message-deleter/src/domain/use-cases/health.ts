import { Logger } from "@/types.js";
import { Database } from "@azure/cosmos";
import { ContainerClient } from "@azure/storage-blob";

export class HealthUseCase {
  commonCosmosDb: Database;
  messageContainerClient: ContainerClient;
  logger: Logger;

  constructor(
    commonCosmosDb: Database,
    messageContainerClient: ContainerClient,
    logger: Logger,
  ) {
    this.commonCosmosDb = commonCosmosDb;
    this.messageContainerClient = messageContainerClient;
    this.logger = logger;
  }

  async execute() {
    try {
      await this.commonCosmosDb.read();
      await this.messageContainerClient.getProperties();
      return {
        body: "it works!",
      };
    } catch (error) {
      this.logger.error(`${error}`);
      return {
        body: "Service connection failed",
        status: 500,
      };
    }
  }
}
