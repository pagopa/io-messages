import { GenericError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import { readFile } from "node:fs/promises";

import {
  type AppInfo,
  type AppInfoReader,
  appInfoSchema,
} from "../../../application/ports/app-info.js";

const parseManifest = Result.fromThrowable(
  (manifest: string): unknown => JSON.parse(manifest),
  () => new GenericError("Application package.json is not valid JSON"),
);

export class PackageJsonAppInfoReader implements AppInfoReader {
  constructor(private readonly manifestUrl: URL) {}

  async getAppInfo(): Promise<Result<AppInfo, GenericError>> {
    return ResultAsync.fromPromise(
      readFile(this.manifestUrl, "utf8"),
      () => new GenericError("Unable to read application package.json"),
    )
      .andThen(parseManifest)
      .andThen((manifest) => {
        const info = appInfoSchema.safeParse(manifest);
        return info.success
          ? ok(info.data)
          : err(new GenericError("Invalid app metadata in package.json"));
      });
  }
}
