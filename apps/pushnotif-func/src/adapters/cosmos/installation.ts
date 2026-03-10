import { Container, Database, ErrorResponse } from "@azure/cosmos";

import { ErrorInternal, ErrorNotFound } from "../../domain/error";
import { InstallationSummary } from "../../domain/installation";
import { InstallationSummaryRepository } from "../../domain/mirror-service";

export class CosmosInstallationSummaryAdapter
  implements InstallationSummaryRepository
{
  container: Container;

  constructor(cosmosdbInstance: Database, containerName: string) {
    this.container = cosmosdbInstance.container(containerName);
  }

  computePartitionId(installationId: string) {
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
        throw new ErrorInternal(
          `Unexpected character [${firstChar}] in installationId: ${installationId}`,
        );
    }
  }

  async deleteInstallationSummary(id: string, nhPartition: string) {
    try {
      const result = await this.container.item(id, nhPartition).delete();
      return result.item.id;
    } catch (err) {
      if (err instanceof ErrorResponse) {
        switch (err.code) {
          case 404:
            return new ErrorNotFound("Installation not found", err);

          default:
            return new ErrorInternal("Failed to delete installation", err);
        }
      }

      return new ErrorInternal("Failed to delete installation", err);
    }
  }

  async upsertInstallationSummary(installationSummary: InstallationSummary) {
    try {
      const result = await this.container.items.upsert(installationSummary, {});
      return result.item.id;
    } catch (err) {
      return new ErrorInternal("Failed to upsert installation", err);
    }
  }
}
