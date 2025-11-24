import {
  authErrorSchema,
  checkQrMandateRequestSchema,
  problemSchema,
} from "@/adapters/send/definitions.js";
import {
  CIEValidationDataSchema,
  attachmentMetadataSchema,
  checkQrMandateResponseSchema,
  idxSchema,
  iunSchema,
  mandateCreationResponseSchema,
  sendHeadersSchema,
  thirdPartyMessageSchema,
} from "@/domain/notification.js";
import { attachmentParamsSchema } from "@/domain/use-cases/get-attachment.js";
import { assertionRefSchema } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import { assertionTypeSchema } from "io-messages-common/adapters/lollipop/definitions/assertion-type";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { lollipopMethodSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-method";
import { lollipopOriginalURLSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-original-url";
import { lollipopSignatureSchema } from "io-messages-common/adapters/lollipop/definitions/signature";
import { lollipopSignatureInputSchema } from "io-messages-common/adapters/lollipop/definitions/signature-input";
import { thumbprintSchema } from "io-messages-common/adapters/lollipop/definitions/thumbprint";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { Mock, vi } from "vitest";

export const aFiscalCode = fiscalCodeSchema.parse("RMLGNN97R06F158N");

export const aCheckQrMandateResponse = checkQrMandateResponseSchema.parse({
  iun: "ABCD-EFGH-IJKL-123456-M-7",
  mandateId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  recipientInfo: { denomination: "aDenomination", taxId: "aTaxId" },
});

export const anAuthErrorResponse = authErrorSchema.parse({
  message: "auth error message",
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
export const anAarQrCodeValue = "aQrCodeValue";
export const anInvalidAarQrCodeValue = "anInvalidQrCodeValuea£";

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
});

export const aDocIdx = idxSchema.parse(1);
export const anAttachmnetIdx = idxSchema.parse(1);
export const aIun = iunSchema.parse("ABCD-EFGH-IJKL-123456-Z-7");
export const anAttachmentName = "F24";
export const anIvalidMandateId = "badMandateId";

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

export const anAttachmentMetadata = attachmentMetadataSchema.parse({
  contentLength: 54092,
  contentType: "application/pdf",
  filename: "documento.pdf",
  sha256: "aValidSha256",
  url: "https://example.com/download/documento.pdf",
});

export const anAttachmentUrl = `/delivery/notifications/received/${aIun}/attachments/payment/${anAttachmentName}?attachmentIdx=1`;

export const aPaymentAttachmentParams = attachmentParamsSchema.parse({
  attachmentIdx: 1,
  attachmentName: anAttachmentName,
  iun: aIun,
  type: "payment",
});

export const aMandateCreationResponse = mandateCreationResponseSchema.parse({
  mandate: {
    dateTo: "2025-12-31",
    mandateId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    verificationCode: "14158",
  },
  requestTTL: 0,
});

export const aDocumentAttachmentParams = attachmentParamsSchema.parse({
  docIdx: 1,
  iun: aIun,
  type: "document",
});

export const aLollipopHeaders: LollipopHeaders = {
  signature: aSignature,
  "signature-input": aSignatureInput,
  "x-pagopa-lollipop-assertion-ref": anAssertionRef,
  "x-pagopa-lollipop-assertion-type": anAssertionType,
  "x-pagopa-lollipop-auth-jwt": "an auth jwt",
  "x-pagopa-lollipop-original-method": anOriginalMethod,
  "x-pagopa-lollipop-original-url": anOriginalUrl,
  "x-pagopa-lollipop-public-key": "a public key",
  "x-pagopa-lollipop-user-id": aFiscalCode,
};

export const aSendHeaders = sendHeadersSchema.parse({
  "x-pagopa-cx-taxid": aFiscalCode,
  "x-pagopa-pn-io-src": "QR_CODE",
  ...aLollipopHeaders,
});

export const aCIEValidationdata = CIEValidationDataSchema.parse({
  mrtdData: {
    dg1: "dg1",
    dg11: "dg11",
    sod: "sod",
  },
  nisData: {
    nis: "nis",
    pub_key: "pub_key",
    sod: "sod",
  },
  signedNonce: "signedNonce",
});

interface MockNotificationClient {
  acceptNotificationMandate: Mock;
  checkAarQrCodeIO: Mock;
  createNotificationMandate: Mock;
  getReceivedNotification: Mock;
  getReceivedNotificationAttachment: Mock;
  getReceivedNotificationDocument: Mock;
}

export const createMockNotificationClient = (): MockNotificationClient => ({
  acceptNotificationMandate: vi
    .fn()
    .mockImplementation(() => Promise.resolve()),
  checkAarQrCodeIO: vi
    .fn()
    .mockImplementation(() => Promise.resolve(aCheckQrMandateResponse)),
  createNotificationMandate: vi
    .fn()
    .mockImplementation(() => Promise.resolve(aMandateCreationResponse)),
  getReceivedNotification: vi
    .fn()
    .mockImplementation(() => Promise.resolve(aThirdPartyMessage)),
  getReceivedNotificationAttachment: vi
    .fn()
    .mockImplementation(() => Promise.resolve(anAttachmentMetadata)),
  getReceivedNotificationDocument: vi
    .fn()
    .mockImplementation(() => Promise.resolve(anAttachmentMetadata)),
});

export const mockNotificationClient = {
  acceptNotificationMandate: vi
    .fn()
    .mockImplementation(() => Promise.resolve()),
  checkAarQrCodeIO: vi
    .fn()
    .mockImplementation(() => Promise.resolve(aCheckQrMandateResponse)),
  createNotificationMandate: vi
    .fn()
    .mockImplementation(() => Promise.resolve(aMandateCreationResponse)),
  getReceivedNotification: vi
    .fn()
    .mockImplementation(() => Promise.resolve(aThirdPartyMessage)),
  getReceivedNotificationAttachment: vi
    .fn()
    .mockImplementation(() => Promise.resolve(anAttachmentMetadata)),
  getReceivedNotificationDocument: vi
    .fn()
    .mockImplementation(() => Promise.resolve(anAttachmentMetadata)),
};
