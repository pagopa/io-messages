import { UTCISODateFromString } from "@pagopa/ts-commons/lib/dates";
import { WithinRangeInteger } from "@pagopa/ts-commons/lib/numbers";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import {
  FiscalCode,
  NonEmptyString,
  OrganizationFiscalCode,
  PatternString,
  Ulid,
  WithinRangeString,
} from "@pagopa/ts-commons/lib/strings";
import { enumType, withDefault } from "@pagopa/ts-commons/lib/types";
import * as t from "io-ts";

// --- Timestamp ---
export const Timestamp = UTCISODateFromString;
export type Timestamp = t.TypeOf<typeof Timestamp>;

// --- MessageSubject ---
export const MessageSubject = WithinRangeString(10, 121);
export type MessageSubject = t.TypeOf<typeof MessageSubject>;

// --- MessageBodyMarkdown ---
export const MessageBodyMarkdown = WithinRangeString(80, 10001);
export type MessageBodyMarkdown = t.TypeOf<typeof MessageBodyMarkdown>;

// --- MessageContentBase ---
const MessageContentBaseR = t.interface({
  markdown: MessageBodyMarkdown,
  subject: MessageSubject,
});
const MessageContentBaseO = t.partial({
  require_secure_channels: t.boolean,
});
export const MessageContentBase = t.exact(
  t.intersection(
    [MessageContentBaseR, MessageContentBaseO],
    "MessageContentBase",
  ),
);
export type MessageContentBase = t.TypeOf<typeof MessageContentBase>;

// --- PaymentAmount ---
export const PaymentAmount = t.union([
  WithinRangeInteger(1, 9999999999),
  t.literal(9999999999),
]);
export type PaymentAmount = t.TypeOf<typeof PaymentAmount>;

// --- PaymentNoticeNumber ---
export const PaymentNoticeNumber = PatternString("^[0123][0-9]{17}$");
export type PaymentNoticeNumber = t.TypeOf<typeof PaymentNoticeNumber>;

// --- PaymentDataBase ---
const PaymentDataBaseR = t.interface({
  amount: PaymentAmount,
  notice_number: PaymentNoticeNumber,
});
const PaymentDataBaseO = t.partial({
  invalid_after_due_date: withDefault(t.boolean, false),
});
export const PaymentDataBase = t.exact(
  t.intersection([PaymentDataBaseR, PaymentDataBaseO], "PaymentDataBase"),
);
export type PaymentDataBase = t.TypeOf<typeof PaymentDataBase>;

// --- Payee ---
const PayeeR = t.interface({
  fiscal_code: OrganizationFiscalCode,
});
const PayeeO = t.partial({});
export const Payee = t.exact(t.intersection([PayeeR, PayeeO], "Payee"));
export type Payee = t.TypeOf<typeof Payee>;

// --- PaymentData ---
const PaymentData2R = t.interface({});
const PaymentData2O = t.partial({
  payee: Payee,
});
export const PaymentData2 = t.exact(
  t.intersection([PaymentData2R, PaymentData2O], "PaymentData2"),
);
export const PaymentData = t.intersection(
  [PaymentDataBase, PaymentData2],
  "PaymentData",
);
export type PaymentData = t.TypeOf<typeof PaymentData>;

// --- PrescriptionNRE ---
export const PrescriptionNRE = WithinRangeString(15, 16);
export type PrescriptionNRE = t.TypeOf<typeof PrescriptionNRE>;

// --- PrescriptionIUP ---
export const PrescriptionIUP = WithinRangeString(1, 17);
export type PrescriptionIUP = t.TypeOf<typeof PrescriptionIUP>;

// --- PrescriberFiscalCode ---
export const PrescriberFiscalCode = FiscalCode;
export type PrescriberFiscalCode = t.TypeOf<typeof PrescriberFiscalCode>;

// --- PrescriptionData ---
const PrescriptionDataR = t.interface({
  nre: PrescriptionNRE,
});
const PrescriptionDataO = t.partial({
  iup: PrescriptionIUP,
  prescriber_fiscal_code: PrescriberFiscalCode,
});
export const PrescriptionData = t.exact(
  t.intersection([PrescriptionDataR, PrescriptionDataO], "PrescriptionData"),
);
export type PrescriptionData = t.TypeOf<typeof PrescriptionData>;

// --- LegalData ---
const LegalDataR = t.interface({
  has_attachment: withDefault(t.boolean, false),
  message_unique_id: NonEmptyString,
  sender_mail_from: NonEmptyString,
});
const LegalDataO = t.partial({
  original_message_url: NonEmptyString,
  pec_server_service_id: NonEmptyString,
});
export const LegalData = t.exact(
  t.intersection([LegalDataR, LegalDataO], "LegalData"),
);
export type LegalData = t.TypeOf<typeof LegalData>;

// --- EUCovidCert ---
const EUCovidCertR = t.interface({
  auth_code: t.string,
});
const EUCovidCertO = t.partial({});
export const EUCovidCert = t.exact(
  t.intersection([EUCovidCertR, EUCovidCertO], "EUCovidCert"),
);
export type EUCovidCert = t.TypeOf<typeof EUCovidCert>;

// --- HasPrecondition ---
export enum HasPreconditionEnum {
  ALWAYS = "ALWAYS",
  NEVER = "NEVER",
  ONCE = "ONCE",
}
export const HasPrecondition = enumType<HasPreconditionEnum>(
  HasPreconditionEnum,
  "HasPrecondition",
);
export type HasPrecondition = t.TypeOf<typeof HasPrecondition>;

// --- ThirdPartyData ---
const ThirdPartyDataR = t.interface({
  id: NonEmptyString,
});
const ThirdPartyDataO = t.partial({
  configuration_id: Ulid,
  has_attachments: withDefault(t.boolean, false),
  has_precondition: HasPrecondition,
  has_remote_content: withDefault(t.boolean, false),
  original_receipt_date: Timestamp,
  original_sender: NonEmptyString,
  summary: NonEmptyString,
});
export const ThirdPartyData = t.exact(
  t.intersection([ThirdPartyDataR, ThirdPartyDataO], "ThirdPartyData"),
);
export type ThirdPartyData = t.TypeOf<typeof ThirdPartyData>;

// --- MessageContent ---
const MessageContent2R = t.interface({});
const MessageContent2O = t.partial({
  due_date: Timestamp,
  eu_covid_cert: EUCovidCert,
  legal_data: LegalData,
  payment_data: PaymentData,
  prescription_data: PrescriptionData,
  third_party_data: ThirdPartyData,
});
export const MessageContent2 = t.exact(
  t.intersection([MessageContent2R, MessageContent2O], "MessageContent2"),
);
export type MessageContent2 = t.TypeOf<typeof MessageContent2>;

export const MessageContent = t.intersection(
  [MessageContentBase, MessageContent2],
  "MessageContent",
);
export type MessageContent = t.TypeOf<typeof MessageContent>;

export const parseMessageContent = (raw: unknown): MessageContent => {
  const decoded = MessageContent.decode(raw);
  if (decoded._tag === "Left") {
    throw new Error(`Invalid MessageContent: ${readableReport(decoded.left)}`);
  }
  return decoded.right;
};
