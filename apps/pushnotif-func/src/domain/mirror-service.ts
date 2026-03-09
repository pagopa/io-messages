import { InstallationSummary } from "./installation";

export interface InstallationRepository {
  computePartitionId(installationId: string): "1" | "2" | "3" | "4";

  deleteInstallationSummary(id: string): Promise<string>;

  upsertInstallationSummary(installation: InstallationSummary): Promise<string>;
}
