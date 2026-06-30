import { GenericError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import { readFile } from "node:fs/promises";

import type {
  AppInfo,
  AppInfoReader,
} from "../../../application/ports/app-info.js";

const parsePackageJson = Result.fromThrowable(
  (raw: string) => JSON.parse(raw),
  (error) =>
    new GenericError(
      `Unable to parse messages-app package.json: ${String(error)}`,
    ),
);

/**
 * Reads the application name and version from the `messages-app` package.json.
 * The path is resolved relative to this module so it always points at the
 * service's own manifest, regardless of the current working directory.
 */
export class PackageJsonAppInfoReader implements AppInfoReader {
  async getAppInfo(): Promise<Result<AppInfo, GenericError>> {
    const packageJsonUrl = new URL("../../../../package.json", import.meta.url);

    const readResult = await ResultAsync.fromPromise(
      readFile(packageJsonUrl, "utf-8"),
      (error) =>
        new GenericError(
          `Unable to read messages-app package.json: ${String(error)}`,
        ),
    );
    if (readResult.isErr()) {
      return err(readResult.error);
    }

    const parseResult = parsePackageJson(readResult.value);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    const pkg = parseResult.value;

    return ok({ name: pkg.name, version: pkg.version });
  }
}
