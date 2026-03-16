import { ErrorInternal, ErrorNotFound, ErrorTooManyRequests } from "./error";
import { JsonPatch } from "./json-patch";

export interface InstallationRepository {
  /**
   * updateInstallation perform an update operation on the installation
   * identified by the `id` using the provided patches.
   * */
  updateInstallation(
    id: string,
    patches: JsonPatch[],
  ): Promise<ErrorInternal | ErrorNotFound | ErrorTooManyRequests | string>;
}
