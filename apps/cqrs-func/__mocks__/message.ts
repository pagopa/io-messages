import * as TE from "fp-ts/lib/TaskEither";

import { FeatureLevelTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/FeatureLevelType";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { NotRejectedMessageStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotRejectedMessageStatusValue";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { TimeToLiveSeconds } from "@pagopa/io-functions-commons/dist/generated/definitions/TimeToLiveSeconds";
import {
  Components,
  MessageView,
  Status
} from "@pagopa/io-functions-commons/dist/src/models/message_view";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import {
  MessageModel,
  RetrievedMessageWithoutContent
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { MessageStatusModel } from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { vi } from "vitest";
import { RetrievedMessageStatusWithFiscalCode } from "../utils/message_status";

export const now = new Date();

export const aFiscalCode = "FRLFRC74E04B157I" as FiscalCode;
export const aMessageId = "A_MESSAGE_ID" as NonEmptyString;

export const cosmosMetadata = {
  _etag: "_etag",
  _rid: "_rid",
  _self: "_self",
  _ts: 1
};

export const aRetrievedMessageWithoutContent: RetrievedMessageWithoutContent = {
  ...cosmosMetadata,
  featureLevelType: FeatureLevelTypeEnum.STANDARD,
  isPending: false,
  fiscalCode: aFiscalCode,
  id: aMessageId,
  indexedId: "A_MESSAGE_ID" as NonEmptyString,
  senderServiceId: "agid" as ServiceId,
  senderUserId: "u123" as NonEmptyString,
  timeToLiveSeconds: 3600 as TimeToLiveSeconds,
  createdAt: new Date(),
  kind: "IRetrievedMessageWithoutContent"
};

export const aMessageBodyMarkdown = "test".repeat(80);
export const aMessageContent = E.getOrElseW(() => {
  throw new Error();
})(
  MessageContent.decode({
    markdown: aMessageBodyMarkdown,
    subject: "test".repeat(10)
  })
);

export const aMessageContentWithDueDate = E.getOrElseW(() => {
  throw new Error();
})(
  MessageContent.decode({
    markdown: aMessageBodyMarkdown,
    subject: "test".repeat(10),
    due_date: now
  })
);
export const aMessageStatus: RetrievedMessageStatusWithFiscalCode = {
  ...cosmosMetadata,
  messageId: aMessageId,
  id: `${aMessageId}-0` as NonEmptyString,
  status: NotRejectedMessageStatusValueEnum.PROCESSED,
  version: 0 as NonNegativeInteger,
  updatedAt: new Date(),
  fiscalCode: aFiscalCode,
  isRead: false,
  isArchived: false,
  kind: "IRetrievedMessageStatus"
};

export const aComponents: Components = {
  attachments: { has: false },
  euCovidCert: { has: false },
  legalData: { has: false },
  payment: { has: false },
  thirdParty: { has: false }
};

export const aStatus: Status = {
  archived: false,
  processing: NotRejectedMessageStatusValueEnum.PROCESSED,
  read: false
};

export const aMessageView: MessageView = {
  components: aComponents,
  createdAt: now,
  fiscalCode: aFiscalCode,
  id: aMessageId,
  messageTitle: "a-msg-title" as NonEmptyString,
  senderServiceId: "a-service-id" as ServiceId,
  status: aStatus,
  version: 0 as NonNegativeInteger
};

export const mockPatch = vi.fn(
  (): TE.TaskEither<CosmosErrors, RetrievedMessageWithoutContent> =>
    TE.of(aRetrievedMessageWithoutContent)
);

export const mockMessageModel: MessageModel = ({
  patch: mockPatch
} as any) as MessageModel;

export const mockUpdateTTLForAllVersions = vi.fn(
  (): TE.TaskEither<CosmosErrors, number> => TE.of(1)
);

export const mockMessageStatusModel: MessageStatusModel = ({
  updateTTLForAllVersions: mockUpdateTTLForAllVersions
} as unknown) as MessageStatusModel;
