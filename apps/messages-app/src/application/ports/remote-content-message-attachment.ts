import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { FiscalCode } from "io-messages-common/domain/fiscal-code";
import { MessageId } from "io-messages-common/domain/message";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import {
  RemoteContentAttachmentUrl,
  RemoteContentMessageAttachment,
} from "io-messages-common/domain/remote-content-message-attachment";
import { Result } from "neverthrow";

export class RemoteContentServiceUnavailableError extends ServiceUnavailableError {
  constructor(readonly retryAfter?: string) {
    super("The Remote Content service returned HTTP status 503.");
  }
}

export interface RemoteContentMessageAttachmentRepository {
  getRemoteContentMessageAttachment: (
    baseUrl: URL,
    authentication: RCAuthenticationConfig,
    messageID: MessageId,
    attachmentURL: RemoteContentAttachmentUrl,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ) => Promise<
    Result<
      RemoteContentMessageAttachment,
      | ForbiddenError
      | GenericError
      | NotFoundError
      | RemoteContentServiceUnavailableError
      | TooManyRequestsError
      | ValidationError
    >
  >;
}
