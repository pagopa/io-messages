import {
  attachmentMetadataResponseSchema,
  checkQrMandateRequestSchema,
  checkQrMandateResponseSchema,
  docIdxSchema,
  iunSchema,
  problemSchema,
  thirdPartyMessageSchema,
} from "@/adapters/send/definitions.js";

export const aCheckQrMandateResponse = checkQrMandateResponseSchema.parse({
  iun: "ABCD-EFGH-IJKL-123456-M-7",
  mandateId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  recipientInfo: { denomination: "aDenomination", taxId: "aTaxId" },
});

export const aCheckQrMandateRequest = checkQrMandateRequestSchema.parse({
  aarQrCodeValue: "a qr code value",
});

export const aProblem = problemSchema.parse({
  detail: "aDetail",
  errors: [
    {
      code: "PN_PARAMETER_TOO_LONG",
      detail: "Parameter not valid",
      element: "body.order.item[2].quantity",
    },
  ],
  status: 503,
  title: "Service Unavailable",
  traceId: "123e4567-e89b-12d3-a456-426614174000",
  type: "https://example.com/docs/errors#invalid-input",
});

export const aDocIdx = docIdxSchema.parse(1);
export const aIun = iunSchema.parse("ABCD-EFGH-IJKL-123456-Z-7");
export const anAttachmentName = "F24";

export const aThirdPartyMessage = thirdPartyMessageSchema.parse({
  attachments: [
    {
      id: "attachment123",
      content_type: "application/pdf",
      name: "documento.pdf",
      url: "https://example.com/documento.pdf",
      category: "DOCUMENT"
    }
  ],
  details: {
    subject: "Avviso di notifica",
    iun: aIun,
    recipients: [
      {
        denomination: "Mario Rossi",
        recipientType: "PF",
        taxId: "RSSMRA85M01H501U",
        payment: {
          noticeCode: "302000100000019421",
          creditorTaxId: "77777777777"
        }
      }
    ],
    notificationStatusHistory: [
      {
        status: "ACCEPTED",
        activeFrom: "2025-09-15T10:00:00+02:00",
        relatedTimelineElements: ["element1", "element2"]
      },
      {
        status: "DELIVERED",
        activeFrom: "2025-09-16T09:30:00+02:00",
        relatedTimelineElements: ["element3"]
      }
    ],
    abstract: "Notifica relativa a pagamento F24",
    senderDenomination: "Comune di Esempio",
    completedPayments: ["302000100000019421"],
    isCancelled: false
  }
})

export const anAttchmentMetadataResponse = attachmentMetadataResponseSchema.parse({
  filename: "documento.pdf",
  contentType: "application/pdf",
  contentLength: 54092,
  sha256: "aValidSha256",
  url: "https://example.com/download/documento.pdf"
})
