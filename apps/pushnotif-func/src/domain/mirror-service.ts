import { InstallationSummary } from "./installation";

export interface InstallationRepository {
  computePartitionId(installationId: string): "1" | "2" | "3" | "4";

  createOrUpdateInstallation(
    installation: InstallationSummary,
  ): Promise<string>;

  deleteInstallation(id: string): Promise<string>;
}
