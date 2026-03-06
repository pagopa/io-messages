import { Database } from "@azure/cosmos";

import { InstallationSummary } from "../../domain/installation";
import { InstallationRepository } from "../../domain/mirror-service";

export class CosmosInstallationAdapter implements InstallationRepository {
  containerName: string;
  cosmosdbInstance: Database;

  constructor(cosmosdbInstance: Database, containerName: string) {
    this.cosmosdbInstance = cosmosdbInstance;
    this.containerName = containerName;
  }

  private getContainer() {
    return this.cosmosdbInstance.container(this.containerName);
  }

  computePartitionId(installationId: string): "1" | "2" | "3" | "4" {
    const firstChar = installationId[0].toLocaleLowerCase();

    switch (true) {
      case /^[0-3]/.test(firstChar):
        return "1";
      case /^[4-7]/.test(firstChar):
        return "2";
      case /^[8-b]/.test(firstChar):
        return "3";
      case /^[c-f]/.test(firstChar):
        return "4";
      default:
        // This case will never happen cause we know that `installationId` is
        // sha256
        throw new Error(
          `Unexpected character [${firstChar}] in installationId: ${installationId}`,
        );
    }
  }

  async createOrUpdateInstallation(
    installation: InstallationSummary,
  ): Promise<string> {
    try {
      const container = this.getContainer();

      const result = await container.items.upsert(installation, {});

      return result.item.id;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(
          `Failed to create or update installation: ${err.message}`,
        );
      }
      throw new Error(
        `Failed to create or update installation: ${String(err)}`,
      );
    }
  }

  async deleteInstallation(id: string): Promise<string> {
    const container = this.getContainer();
    const nhPartition = this.computePartitionId(id);

    try {
      const result = await container.item(id, nhPartition).delete();
      return result.item.id;
    } catch (err) {
      if (err instanceof Error) {
        if ("code" in err && err.code === 404) {
          // If the item is not found, we consider the deletion successful
          return id;
        }
        throw new Error(`Failed to delete installation: ${err.message}`);
      }
      throw new Error(`Failed to delete installation: ${String(err)}`);
    }
  }
}
