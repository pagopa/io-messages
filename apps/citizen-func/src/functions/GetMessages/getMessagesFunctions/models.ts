/* eslint-disable sort-keys */
import { MessageCategoryBase } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryBase";
import { MessageCategoryPN } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPN";
import { TagEnum as TagEnumPayment } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPayment";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { TimeToLiveSeconds } from "@pagopa/io-functions-commons/dist/generated/definitions/TimeToLiveSeconds";
import { DateFromTimestamp } from "@pagopa/ts-commons/lib/dates";
import {
  FiscalCode,
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import { enumType, withDefault } from "@pagopa/ts-commons/lib/types";
import * as t from "io-ts";

// ---------------------------------------
// ---------------------------------------

export const InternalMessageCategoryPayment = t.exact(
  t.intersection([
    t.interface({
      noticeNumber: NonEmptyString,
      tag: enumType<TagEnumPayment>(TagEnumPayment, "tag"),
    }),
    t.partial({
      payeeFiscalCode: OrganizationFiscalCode,
    }),
  ]),
  "MessageCategoryPayment",
);

export type InternalMessageCategoryPayment = t.TypeOf<
  typeof InternalMessageCategoryPayment
>;

// ---------------------------------------
// ---------------------------------------

export const InternalMessageCategory = t.union(
  [InternalMessageCategoryPayment, MessageCategoryBase, MessageCategoryPN],
  "MessageCategory",
);

export type InternalMessageCategory = t.TypeOf<typeof InternalMessageCategory>;

// ---------------------------------------
// ---------------------------------------

// required attributes
const EnrichedMessageWithContentR = t.interface({
  created_at: DateFromTimestamp,
  fiscal_code: FiscalCode,
  id: NonEmptyString,
  is_archived: t.boolean,
  is_read: t.boolean,
  message_title: t.string,
  sender_service_id: ServiceId,
});

// optional attributes
const EnrichedMessageWithContentO = t.partial({
  category: InternalMessageCategory,
  has_attachments: withDefault(t.boolean, false),
  has_precondition: withDefault(t.boolean, false),
  has_remote_content: withDefault(t.boolean, false),
  time_to_live: TimeToLiveSeconds,
});

export const EnrichedMessageWithContent = t.exact(
  t.intersection(
    [EnrichedMessageWithContentR, EnrichedMessageWithContentO],
    "EnrichedMessage",
  ),
);

export type EnrichedMessageWithContent = t.TypeOf<
  typeof EnrichedMessageWithContent
>;
