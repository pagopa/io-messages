import type { FiscalCode } from "@pagopa/hexagonal-core";
import type { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import type { RCConfiguration } from "io-messages-common/domain/remote-content";
import type { RemoteContentAttachmentUrl } from "io-messages-common/domain/remote-content-message-attachment";

import type { MessageContent } from "./message-content.js";
import type { MessageMetadata } from "./message-metadata.js";
import type { RemoteContentMessageRepository } from "./remote-content-message.js";
import type { RemoteContentMessageAttachmentRepository } from "./remote-content-message-attachment.js";
import type { RemoteContentMessagePreconditionRepository } from "./remote-content-message-precondition.js";

export interface RemoteContentProxyRequest {
  fiscalCode: FiscalCode;
  lollipopHeaders?: LollipopHeaders;
  rcConfiguration: RCConfiguration;
  senderServiceId: MessageMetadata["senderServiceId"];
  thirdPartyMessageId: NonNullable<MessageContent["third_party_data"]>["id"];
}

export interface RemoteContentProxyAttachmentRequest
  extends RemoteContentProxyRequest {
  attachmentUrl: RemoteContentAttachmentUrl;
}

export interface RemoteContentProxy {
  getRemoteContentMessage(
    request: RemoteContentProxyRequest,
  ): ReturnType<RemoteContentMessageRepository["getRemoteContentMessage"]>;

  getRemoteContentMessageAttachment(
    request: RemoteContentProxyAttachmentRequest,
  ): ReturnType<
    RemoteContentMessageAttachmentRepository["getRemoteContentMessageAttachment"]
  >;

  getRemoteContentMessagePrecondition(
    request: RemoteContentProxyRequest,
  ): ReturnType<
    RemoteContentMessagePreconditionRepository["getRemoteContentMessagePrecondition"]
  >;
}
