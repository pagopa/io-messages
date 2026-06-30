import type { GenericError } from "@pagopa/hexagonal-core";
import type { Result } from "neverthrow";

export interface AppInfo {
  readonly name: string;
  readonly version: string;
}

export interface AppInfoReader {
  getAppInfo(): Promise<Result<AppInfo, GenericError>>;
}
