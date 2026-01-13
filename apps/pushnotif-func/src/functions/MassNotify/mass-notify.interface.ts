import * as z from "zod";
import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

// required attributes
export const MassNotifyBodyR = z.object({
  subject: z.string(),
  body: z.string(),
  template: z.string(),
  tags: z.readonly(z.array(z.string())),
});
// optional attributes
export const MassNotifyBodyO = z.object({});

export const MassNotifyBody = z.intersection(MassNotifyBodyR, MassNotifyBodyO);
export type MassNotifyBody = z.infer<typeof MassNotifyBody>;

// Legacy io-ts interface
const MassNotifyR = t.interface({
  subject: NonEmptyString,

  body: NonEmptyString,

  template: NonEmptyString,

  tags: t.readonlyArray(NonEmptyString),
});

const MassNotifyO = t.partial({});

export const MassNotifyBodyLegacy = t.intersection(
  [MassNotifyR, MassNotifyO],
  "MassNotifyBody",
);

export type MassNotifyBodyLegacy = t.TypeOf<typeof MassNotifyBodyLegacy>;
