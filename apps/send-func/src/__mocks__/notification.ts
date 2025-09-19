import {
  aarQrCodeValueSchema,
  attachmentMetadataResponseSchema,
  checkQrMandateRequestSchema,
  checkQrMandateResponseSchema,
  docIdxSchema,
  iunSchema,
  problemSchema,
  thirdPartyMessageSchema,
} from "@/adapters/send/definitions.js";
import { assertionRefSchema } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import { assertionTypeSchema } from "io-messages-common/adapters/lollipop/definitions/assertion-type";
import { lollipopMethodSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-method";
import { lollipopOriginalURLSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-original-url";
import { lollipopSignatureSchema } from "io-messages-common/adapters/lollipop/definitions/signature";
import { lollipopSignatureInputSchema } from "io-messages-common/adapters/lollipop/definitions/signature-input";
import { thumbprintSchema } from "io-messages-common/adapters/lollipop/definitions/thumbprint";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";

export const aFiscalCode = fiscalCodeSchema.parse("RMLGNN97R06F158N");

export const aCheckQrMandateResponse = checkQrMandateResponseSchema.parse({
  iun: "ABCD-EFGH-IJKL-123456-M-7",
  mandateId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  recipientInfo: { denomination: "aDenomination", taxId: "aTaxId" },
});

export const anAssertionRef = assertionRefSchema.parse(
  "sha256-6LvipIvFuhyorHpUqK3HjySC5Y6gshXHFBhU9EJ4DoM=",
);
export const aThumbprint = thumbprintSchema.parse(
  "6LvipIvFuhyorHpUqK3HjySC5Y6gshXHFBhU9EJ4DoM=",
);
export const anotherAssertionRef = assertionRefSchema.parse(
  "sha512-Dj51I0q8aPQ3ioaz9LMqGYujAYRbDNblAQbodDRXAMxmY6hsHqEl3F6SvhfJj5oPhcqdX1ldsgEvfMNXGUXBIw==",
);
export const aSignature = lollipopSignatureSchema.parse(
  "sig1=:hNojB+wWw4A7SYF3qK1S01Y4UP5i2JZFYa2WOlMB4Np5iWmJSO0bDe2hrYRbcIWqVAFjuuCBRsB7lYQJkzbb6g==:",
);
export const aSignatureInput = lollipopSignatureInputSchema.parse(
  `sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url"); created=1618884475; keyid="${aThumbprint}"`,
);
export const anOriginalMethod = lollipopMethodSchema.enum.POST;
export const anOriginalUrl = lollipopOriginalURLSchema.parse(
  "https://api.pagopa.it",
);

export const anInvalidSignatureInput = lollipopSignatureInputSchema.parse(
  `sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url"); created=1618884475; keyid="#an-invalid-thumbprint#"`,
);

export const anAssertionType = assertionTypeSchema.enum.SAML;
export const anAarQrCodeValue = aarQrCodeValueSchema.parse("a qr code value");

export const aCheckQrMandateRequest = checkQrMandateRequestSchema.parse({
  aarQrCodeValue: anAarQrCodeValue,
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
      category: "DOCUMENT",
      content_type: "application/pdf",
      id: "attachment123",
      name: "documento.pdf",
      url: "https://example.com/documento.pdf",
    },
  ],
  details: {
    abstract: "Notifica relativa a pagamento F24",
    completedPayments: ["302000100000019421"],
    isCancelled: false,
    iun: aIun,
    notificationStatusHistory: [
      {
        activeFrom: "2025-09-15T10:00:00+02:00",
        relatedTimelineElements: ["element1", "element2"],
        status: "ACCEPTED",
      },
      {
        activeFrom: "2025-09-16T09:30:00+02:00",
        relatedTimelineElements: ["element3"],
        status: "DELIVERED",
      },
    ],
    recipients: [
      {
        denomination: "Mario Rossi",
        payment: {
          creditorTaxId: "77777777777",
          noticeCode: "302000100000019421",
        },
        recipientType: "PF",
        taxId: "RSSMRA85M01H501U",
      },
    ],
    senderDenomination: "Comune di Esempio",
    subject: "Avviso di notifica",
  },
});

export const anAttchmentMetadataResponse =
  attachmentMetadataResponseSchema.parse({
    contentLength: 54092,
    contentType: "application/pdf",
    filename: "documento.pdf",
    sha256: "aValidSha256",
    url: "https://example.com/download/documento.pdf",
  });
