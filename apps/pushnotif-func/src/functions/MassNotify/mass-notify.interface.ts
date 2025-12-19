import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

// required attributes
const MassNotifyR = t.interface({
  subject: NonEmptyString,

  body: NonEmptyString,

  template: NonEmptyString,

  tags: t.readonlyArray(NonEmptyString),
});

// optional attributes
const MassNotifyO = t.partial({});

export const MassNotifyBody = t.intersection(
  [MassNotifyR, MassNotifyO],
  "MassNotifyBody",
);

export type MassNotifyBody = t.TypeOf<typeof MassNotifyBody>;
