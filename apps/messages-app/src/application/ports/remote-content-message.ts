import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { FiscalCode } from "io-messages-common/domain/fiscal-code";
import { MessageId } from "io-messages-common/domain/message";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import { RemoteContentMessage } from "io-messages-common/domain/remote-content-message";
import { Result } from "neverthrow";

export interface RemoteContentMessageRepository {
  getRemoteContentMessage: (
    baseUrl: URL,
    authentication: RCAuthenticationConfig,
    messageID: MessageId,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ) => Promise<
    Result<
      RemoteContentMessage,
      | ForbiddenError
      | GenericError
      | NotFoundError
      | TooManyRequestsError
      | ValidationError
    >
  >;
}
