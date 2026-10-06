import { FiscalCode, GenericError } from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import { RemoteContentMessagePrecondition } from "io-messages-common/domain/remote-content-message-precondition";
import { Result } from "neverthrow";

export interface SendNotificationPreconditionRepository {
  getNotificationPrecondition: (
    baseUrl: URL,
    authentication: RCAuthenticationConfig,
    iun: string,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ) => Promise<Result<RemoteContentMessagePrecondition, GenericError>>;
}
