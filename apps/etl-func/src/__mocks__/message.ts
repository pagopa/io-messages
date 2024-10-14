import {
  messageContentSchema,
  messageMetadataSchema,
} from "@/domain/entities/message.js";

export const aSimpleMessageMetadata = messageMetadataSchema.parse({
  id: "01EHA1R1TSJP8DNYYG2TTR1B28",
  indexedId: "01EHA1R1TTJG01AHEDQEFNHFS9",
  fiscalCode: "RMLGNN97R06F158N",
  createdAt: "2020-05-11T22:59:50.221Z",
  senderServiceId: "synthesizing",
  senderUserId: "interface",
  isPending: false,
  timeToLiveSeconds: 6125,
  _rid: "Xl0hAOfz93oCAAAAAAAAAA==",
  _self: "dbs/Xl0hAA==/colls/Xl0hAOfz93o=/docs/Xl0hAOfz93oCAAAAAAAAAA==/",
  _etag: '"00009e2f-0000-5b00-0000-6686a02b0000"',
  _attachments: "attachments/",
  _ts: 1720098859,
});

export const aSimpleMessageContent = messageContentSchema.parse({
  subject: "A valid subject, this is used as title",
  markdown:
    "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is more than 80 chars",
  senderMetadata: {
    service_name: "ServiceName",
    organization_name: "OrganizationName",
    department_name: "DepartmentName",
  },
  message: {
    createdAt: "Timestamp",
    featureLevelType: "STANDARD",
    fiscalCode: "RMLGNN97R06F158N",
    indexedId: "01EHA1R1TSJP8DNYYG2TTR1B28",
    senderServiceId: "synthesizing",
    senderUserId: "NonEmptyString",
    timeToLiveSeconds: -1,
  },
});
