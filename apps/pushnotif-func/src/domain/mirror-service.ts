import { Installation } from "./installation";

export interface InstallationRepository {
  createOrUpdateInstallation(
    installation: Installation,
  ): Promise<Error | string>;

  deleteInstallation(id: string): Promise<Error | string>;
}
