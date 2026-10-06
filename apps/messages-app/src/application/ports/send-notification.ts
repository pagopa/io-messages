import { FiscalCode, GenericError } from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { MessageId } from "io-messages-common/domain/message";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import { SendNotificationResponse } from "io-messages-common/domain/send-notification";
import { Result } from "neverthrow";

export interface SendNotificationRepository {
  getNotification: (
    baseUrl: URL,
    authentication: RCAuthenticationConfig,
    messageID: MessageId,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ) => Promise<Result<SendNotificationResponse, GenericError>>;
}
