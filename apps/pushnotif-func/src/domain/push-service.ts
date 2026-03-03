import { JsonPatch } from "./json-patch";

export interface InstallationRepository {
  updateInstallation(id: string, patches: JsonPatch[]): Promise<Error | string>;
}
