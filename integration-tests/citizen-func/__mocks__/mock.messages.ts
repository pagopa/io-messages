import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { TimeToLiveSeconds } from "@pagopa/io-functions-commons/dist/generated/definitions/TimeToLiveSeconds";

import { TagEnum as TagEnumBase } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryBase";

import { NewMessageWithContent } from "@pagopa/io-functions-commons/dist/src/models/message";
import { retrievedMessageToPublic } from "@pagopa/io-functions-commons/dist/src/utils/messages";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { aServiceID, serviceList } from "./mock.services";
import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";
import { pipe } from "fp-ts/lib/function";

import * as RA from "fp-ts/ReadonlyArray";
import {
  MessageStatus,
  NewMessageStatus
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { FeatureLevelTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/FeatureLevelType";
import { NotRejectedMessageStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotRejectedMessageStatusValue";
import { ThirdPartyData } from "@pagopa/io-functions-commons/dist/generated/definitions/ThirdPartyData";
import { Ulid } from "@pagopa/ts-commons/lib/strings";
import { EnrichedMessage } from "@pagopa/io-functions-commons/dist/generated/definitions/EnrichedMessage";

export const aFiscalCodeWithoutMessages = "FFLFRC74E04B157I" as FiscalCode;
export const aFiscalCodeWithMessages = "FRLFRC74E04B157I" as FiscalCode;
export const aFiscalCodeWithMessagesWithThirdParty = "FRNFRC74E04B157I" as FiscalCode;
export const aFiscalCodeWithMessagesWithThirdPartyWithConfigId = "FRCFRC74E04B157I" as FiscalCode;


export const aMessageBodyMarkdown = "test".repeat(80);
export const aValidThirdPartyData: ThirdPartyData = {
  id: "thirdPartyId" as NonEmptyString,
  has_attachments: false,
  has_remote_content: false
};

export const aMessageContent = {
  markdown: aMessageBodyMarkdown,
  subject: "test".repeat(10)
};

export const aMessage: NewMessageWithContent = {
  content: aMessageContent as Omit<MessageContent, "payment_data">,
  createdAt: new Date(),
  featureLevelType: FeatureLevelTypeEnum.STANDARD,
  fiscalCode: aFiscalCodeWithMessages,
  id: "A_MESSAGE_ID" as NonEmptyString,
  indexedId: "A_MESSAGE_ID" as NonEmptyString,
  isPending: false,
  kind: "INewMessageWithContent" as const,
  senderServiceId: aServiceID,
  senderUserId: "u123" as NonEmptyString,
  timeToLiveSeconds: 3600 as TimeToLiveSeconds
};

export const aMessageWithThirdPartyData: NewMessageWithContent = {
  ...aMessage,
  fiscalCode: aFiscalCodeWithMessagesWithThirdParty,
  id: "aMessageWithThirdPartyData" as NonEmptyString,
  indexedId: `aMessageWithThirdPartyData` as NonEmptyString,
  content: {
    ...aMessage.content,
    third_party_data: aValidThirdPartyData
  }
};

export const aThirdPartyDataWithConfigId: ThirdPartyData = {
  ...aValidThirdPartyData,
  configuration_id: "01ARZ3NDEKTSV2TRFFQ69G5FAV" as Ulid
}

export const aMessageWithThirdPartyDataWithConfigId: NewMessageWithContent = {
  ...aMessage,
  fiscalCode: aFiscalCodeWithMessagesWithThirdPartyWithConfigId,
  id: "aMessageWithThirdPartyDataWithConfigId" as NonEmptyString,
  indexedId: `aMessageWithThirdPartyDataWithConfigId` as NonEmptyString,
  content: {
    ...aMessage.content,
    third_party_data: aThirdPartyDataWithConfigId
  }
};

const messageListLength = 9;
export const messagesWithoutThirdPartyDataList = Array.from(
  { length: messageListLength },
  (_, i) => ({
    ...aMessage,
    id: `${aMessage.id}_${messageListLength - i - 1}` as NonEmptyString,
    indexedId: `${aMessage.id}_${messageListLength - i - 1}` as NonEmptyString
  })
);
export const messagesList = [
  ...messagesWithoutThirdPartyDataList,
  aMessageWithThirdPartyData,
  aMessageWithThirdPartyDataWithConfigId
];

export const messageStatusList = pipe(
  messagesList,
  RA.map(m => [
    {
      fiscalCode: m.fiscalCode,
      messageId: m.id,
      id: `${m.id}-${"0".repeat(15)}0`,
      version: 0,
      isArchived: false,
      isRead: false,
      status: NotRejectedMessageStatusValueEnum.ACCEPTED,
      updatedAt: new Date(),
      kind: "INewMessageStatus"
    },
    {
      fiscalCode: m.fiscalCode,
      messageId: m.id,
      id: `${m.id}-${"0".repeat(15)}1`,
      version: 1,
      isArchived: false,
      isRead: false,
      status: NotRejectedMessageStatusValueEnum.PROCESSED,
      updatedAt: new Date(),
      kind: "INewMessageStatus"
    }
  ]),
  RA.flatten
) as ReadonlyArray<NewMessageStatus>;

// -------

export const mockEnrichMessage = (
  message: NewMessageWithContent
): EnrichedMessage => {
  const service = serviceList.find(
    s => s.serviceId === message.senderServiceId
  );

  return {
    ...retrievedMessageToPublic((message as any) as RetrievedMessage),
    has_attachments: false,
    time_to_live: message.timeToLiveSeconds,
    message_title: message.content.subject,
    service_name: service!.serviceName,
    organization_name: service!.organizationName,
    organization_fiscal_code: service!.organizationFiscalCode,
    category: { tag: TagEnumBase.GENERIC },
    is_archived: false,
    is_read: false
  };
};

export const aMessageStatus: MessageStatus = {
  messageId: aMessage.id,
  status: NotRejectedMessageStatusValueEnum.PROCESSED,
  updatedAt: new Date(),
  isArchived: false,
  isRead: false
};
