import { Container, Database } from "@azure/cosmos";

import { ErrorNotFound } from "../../domain/error";
import { InstallationSummary } from "../../domain/installation";
import { InstallationRepository } from "../../domain/mirror-service";

export class CosmosInstallationSummaryAdapter
  implements InstallationRepository
{
  container: Container;

  constructor(cosmosdbInstance: Database, containerName: string) {
    this.container = cosmosdbInstance.container(containerName);
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

  async deleteInstallationSummary(id: string): Promise<string> {
    const nhPartition = this.computePartitionId(id);

    try {
      const result = await this.container.item(id, nhPartition).delete();
      return result.item.id;
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === 404) {
        throw new ErrorNotFound("Installation not found", err);
      }
      throw err;
    }
  }

  async upsertInstallationSummary(
    installationSummary: InstallationSummary,
  ): Promise<string> {
    const result = await this.container.items.upsert(installationSummary, {});

    return result.item.id;
  }
}
