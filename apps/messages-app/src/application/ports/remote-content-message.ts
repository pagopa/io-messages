import {
  BadGatewayError,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { RemoteContentMessage } from "io-messages-common/adapters/remote-content-message";
import { MessageId } from "io-messages-common/domain/message";
import { Result } from "neverthrow";

export interface RemoteContentMessageRepository {
  getRemoteContentMessage: (
    baseUrl: URL,
    messageID: MessageId,
    lollipopHeaders: LollipopHeaders,
  ) => Promise<
    Result<
      RemoteContentMessage,
      | GenericError
      | ValidationError
      | ForbiddenError
      | NotFoundError
      | TooManyRequestsError
      | BadGatewayError
    >
  >;
}
