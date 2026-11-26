import { FiscalCode, GenericError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";

import { MalformedEntityError } from "./error.js";

export interface MessageReadAuthorizationRepository {
  canAccessReadStatus(
    subscriptionId: string,
    fiscalCode: FiscalCode,
  ): Promise<Result<boolean, GenericError | MalformedEntityError>>;
}
