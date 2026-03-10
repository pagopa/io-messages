import { ErrorInternal, ErrorNotFound } from "./error";
import { InstallationSummary } from "./installation";

export interface InstallationSummaryRepository {
  computePartitionId(installationId: string): "1" | "2" | "3" | "4";

  deleteInstallationSummary(
    id: string,
    nhPartition: string,
  ): Promise<ErrorInternal | ErrorNotFound | string>;

  upsertInstallationSummary(
    installation: InstallationSummary,
  ): Promise<ErrorInternal | string>;
}
