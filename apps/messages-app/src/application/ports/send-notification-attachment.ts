import { FiscalCode, GenericError } from "@pagopa/hexagonal-core";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";
import {
  RemoteContentAttachmentUrl,
  RemoteContentMessageAttachment,
} from "io-messages-common/domain/remote-content-message-attachment";
import { Result } from "neverthrow";

import { RemoteContentServiceUnavailableError } from "./remote-content-message-attachment.js";

export interface SendNotificationAttachmentRepository {
  getNotificationAttachment: (
    baseUrl: URL,
    authentication: RCAuthenticationConfig,
    iun: string,
    attachmentURL: RemoteContentAttachmentUrl,
    fiscalCode: FiscalCode,
    lollipopHeaders?: LollipopHeaders,
  ) => Promise<
    Result<
      RemoteContentMessageAttachment,
      GenericError | RemoteContentServiceUnavailableError
    >
  >;
}
