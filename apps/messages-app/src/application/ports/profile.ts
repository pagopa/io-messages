import { FiscalCode, GenericError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";

import { MalformedEntityError } from "./error.js";

export interface Profile {
  readonly lastAppVersion: string;
  readonly servicePreferencesSettings:
    | { readonly mode: "AUTO" | "MANUAL"; readonly version: number }
    | { readonly mode: "LEGACY"; readonly version: -1 };
}

export interface ProfileRepository {
  getProfile(
    fiscalCode: FiscalCode,
  ): Promise<Result<Profile, GenericError | MalformedEntityError>>;
}
