import {
  Message,
  messageContentSchema,
  messageMetadataSchema,
} from "@/domain/message.js";

export const aSimpleMessageMetadata = messageMetadataSchema.parse({
  _attachments: "attachments/",
  _etag: '"00009e2f-0000-5b00-0000-6686a02b0000"',
  _rid: "Xl0hAOfz93oCAAAAAAAAAA==",
  _self: "dbs/Xl0hAA==/colls/Xl0hAOfz93o=/docs/Xl0hAOfz93oCAAAAAAAAAA==/",
  _ts: 1720098859,
  createdAt: "2020-05-11T22:59:50.221Z",
  fiscalCode: "RMLGNN97R06F158N",
  id: "01EHA1R1TSJP8DNYYG2TTR1B28",
  indexedId: "01EHA1R1TTJG01AHEDQEFNHFS9",
  isPending: false,
  senderServiceId: "synthesizing",
  senderUserId: "interface",
  timeToLiveSeconds: 6125,
});

export const aSimpleMessageContent = messageContentSchema.parse({
  markdown:
    "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is more than 80 chars",
  message: {
    createdAt: "Timestamp",
    featureLevelType: "STANDARD",
    fiscalCode: "RMLGNN97R06F158N",
    indexedId: "01EHA1R1TSJP8DNYYG2TTR1B28",
    senderServiceId: "synthesizing",
    senderUserId: "NonEmptyString",
    timeToLiveSeconds: -1,
  },
  senderMetadata: {
    department_name: "DepartmentName",
    organization_name: "OrganizationName",
    service_name: "ServiceName",
  },
  subject: "A valid subject, this is used as title",
});

export const aSimpleMessage: Message = {
  content: aSimpleMessageContent,
  id: aSimpleMessageMetadata.id,
  metadata: aSimpleMessageMetadata,
};
