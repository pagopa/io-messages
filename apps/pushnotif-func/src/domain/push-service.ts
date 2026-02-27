import { ErrorNotFound } from "./error";
import { Installation } from "./installation";
import { JsonPatch } from "./json-patch";

export interface InstallationRepository {
  getInstallation(id: string): Promise<Error | ErrorNotFound | Installation>;
  updateInstallation(id: string, patches: JsonPatch[]): Promise<Error | string>;
}
