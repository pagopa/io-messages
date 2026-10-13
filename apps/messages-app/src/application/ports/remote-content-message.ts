import {
  BaseError,
  FiscalCode,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { MessageId } from "io-messages-common/domain/message";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import { RemoteContentMessage } from "io-messages-common/domain/remote-content-message";
import { Result } from "neverthrow";

export class RemoteContentMessageBadGatewayError extends BaseError {
  override readonly kind = "RemoteContentMessageBadGatewayError" as const;
  override tag = "remote-content-message-bad-gateway";

  constructor(readonly detail: string) {
    super(detail);
  }
}

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
