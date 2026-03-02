import { Database } from "@azure/cosmos";

import { Installation } from "../../domain/installation";
import { InstallationRepository } from "../../domain/mirror-service";

export class CosmosInstallationAdapter implements InstallationRepository {
  containerName: string;
  cosmosdbInstance: Database;

  constructor(cosmosdbInstance: Database, containerName: string) {
    this.cosmosdbInstance = cosmosdbInstance;
    this.containerName = containerName;
  }

  private computePartitionId(installationId: string): string {
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

  private getContainer() {
    return this.cosmosdbInstance.container(this.containerName);
  }

  async createOrUpdateInstallation(
    installation: Installation,
  ): Promise<Error | string> {
    try {
      const container = this.getContainer();
      await container.items.upsert(
        {
          id: installation.installationId,
          partitionKey: this.computePartitionId(installation.installationId),
          ...installation,
        },
        {},
      );

      return installation.installationId;
    } catch (err) {
      return new Error(
        `Failed to create or update installation: ${String(err)}`,
      );
    }
  }

  async deleteInstallation(id: string): Promise<Error | string> {
    const container = this.getContainer();

    try {
      await container.item(id).delete();
      return id;
    } catch (err) {
      return new Error(`Failed to delete installation: ${String(err)}`);
    }
  }
}
