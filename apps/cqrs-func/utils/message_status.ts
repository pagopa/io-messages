import { RetrievedMessageStatus } from "@pagopa/io-functions-commons/dist/src/models/message_status";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

export const RetrievedMessageStatusWithFiscalCode = t.intersection([
  RetrievedMessageStatus,
  t.interface({ fiscalCode: FiscalCode })
]);
export type RetrievedMessageStatusWithFiscalCode = t.TypeOf<
  typeof RetrievedMessageStatusWithFiscalCode
>;
