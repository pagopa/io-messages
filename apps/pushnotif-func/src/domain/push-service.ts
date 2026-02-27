import { ErrorNotFound } from "./error";
import { Installation } from "./installation";
import { JsonPatch } from "./json-patch";

export interface InstallationRepository {
  getInstallation(id: string): Promise<Installation | ErrorNotFound | Error>;
  updateInstallation(id: string, patches: JsonPatch[]): Promise<string | Error>;
}
