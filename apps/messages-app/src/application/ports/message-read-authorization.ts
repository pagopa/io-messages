import { FiscalCode, GenericError } from "@pagopa/hexagonal-core";
import { Result } from "neverthrow";

export interface MessageReadAuthorizationRepository {
  canAccessReadStatus(
    subscriptionId: string,
    fiscalCode: FiscalCode,
  ): Promise<Result<boolean, GenericError>>;
}
