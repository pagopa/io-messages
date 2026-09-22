import { BlockedInboxOrChannel } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/BlockedInboxOrChannel";
import { NewMessageDefaultAddresses } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/NewMessageDefaultAddresses";
import { OrganizationFiscalCode } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/OrganizationFiscalCode";
import { ServiceCategory } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/ServiceCategory";
import { StandardServiceCategoryEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/StandardServiceCategory";
import { NewMessageWithoutContent } from "@pagopa/io-functions-commons/dist/src/models/message";
import { RetrievedProfile } from "@pagopa/io-functions-commons/dist/src/models/profile";
import { NonNegativeNumber } from "@pagopa/ts-commons/lib/numbers";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import * as t from "io-ts";

import { MessageContent } from "../../generated/definitions/MessageContent";

export type MessageId = NewMessageWithoutContent["id"] & // interseption needed to keep both definitions consistent
  t.TypeOf<typeof MessageId>;
export const MessageId = NonEmptyString;

export type CreatedMessageEventSenderMetadata = t.TypeOf<
  typeof CreatedMessageEventSenderMetadata
>;
export const CreatedMessageEventSenderMetadata = t.intersection([
  t.type({
    organizationFiscalCode: OrganizationFiscalCode,
    organizationName: NonEmptyString,
    requireSecureChannels: t.boolean,
    serviceCategory: withDefault(
      ServiceCategory,
      StandardServiceCategoryEnum.STANDARD,
    ),
    serviceName: NonEmptyString,
    serviceUserEmail: EmailString,
  }),
  t.partial({
    departmentName: NonEmptyString,
  }),
]);

export type CommonMessageData = t.TypeOf<typeof CommonMessageData>;
export const CommonMessageData = t.type({
  content: MessageContent,
  message: NewMessageWithoutContent,
  senderMetadata: CreatedMessageEventSenderMetadata,
});

export type CreatedMessageEvent = t.TypeOf<typeof CreatedMessageEvent>;
export const CreatedMessageEvent = t.intersection(
  [
    t.type({
      messageId: MessageId,
    }),
    t.partial({
      defaultAddresses: NewMessageDefaultAddresses,
      serviceVersion: NonNegativeNumber,
    }),
  ],
  "CreatedMessageEvent",
);

export type ProcessedMessageEvent = t.TypeOf<typeof ProcessedMessageEvent>;
export const ProcessedMessageEvent = t.type({
  blockedInboxOrChannels: t.readonlyArray(BlockedInboxOrChannel),
  messageId: MessageId,
  profile: RetrievedProfile,
});

export type NotificationCreatedEvent = t.TypeOf<
  typeof NotificationCreatedEvent
>;
export const NotificationCreatedEvent = t.type({
  messageId: MessageId,
  notificationId: NonEmptyString,
});
