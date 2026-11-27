import {
  FiscalCode,
  GenericError,
  NotFoundError,
} from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";

import { MalformedEntityError } from "./error.js";

export interface ServicePreferences {
  readonly accessReadMessageStatus: "ALLOW" | "DENY" | "UNKNOWN";
}

export interface ServicePreferencesRepository {
  getServicePreferences(
    fiscalCode: FiscalCode,
    serviceId: string,
    settingsVersion: number,
  ): Promise<
    Result<
      ServicePreferences,
      GenericError | MalformedEntityError | NotFoundError
    >
  >;
}
