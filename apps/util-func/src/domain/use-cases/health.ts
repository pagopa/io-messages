import { Logger } from "@/types.js";
import { Database } from "@azure/cosmos";
import { ContainerClient } from "@azure/storage-blob";

export class HealthUseCase {
  commonCosmosDb: Database;
  deletedMessagesLogs: ContainerClient;
  logger: Logger;
  messageContainerClient: ContainerClient;

  constructor(
    commonCosmosDb: Database,
    messageContainerClient: ContainerClient,
    logger: Logger,
    deletedMessagesLogs: ContainerClient,
  ) {
    this.commonCosmosDb = commonCosmosDb;
    this.messageContainerClient = messageContainerClient;
    this.logger = logger;
    this.deletedMessagesLogs = deletedMessagesLogs;
  }

  async execute() {
    try {
      await this.commonCosmosDb.read();
      await this.messageContainerClient.getProperties();
      await this.deletedMessagesLogs.getProperties();
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
