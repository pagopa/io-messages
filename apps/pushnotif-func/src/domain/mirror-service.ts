import { Installation } from "./installation";

export interface InstallationRepository {
  createOrUpdateInstallation(installation: Installation): Promise<string>;

  deleteInstallation(id: string): Promise<string>;
}
