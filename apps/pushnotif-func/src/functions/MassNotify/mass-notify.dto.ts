import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { enumType } from "@pagopa/ts-commons/lib/types";
import * as z from "zod";

export const MassNotifyMessagePayload = z.object({
  message: z.string(),
  title: z.string(),
});
export type MassNotifyMessagePayload = z.infer<typeof MassNotifyMessagePayload>;

export const MassNotifyKind = z.enum(["Generic"]);
export type MassNotifyKind = z.infer<typeof MassNotifyKind>;

export const MassNotifyMessage = z.object({
  payload: MassNotifyMessagePayload,
  template: z.string(),
  tags: z.readonly(z.array(z.string())),
  kind: MassNotifyKind,
});
export type MassNotifyMessage = z.infer<typeof MassNotifyMessage>;

// Legacy io-ts types for backward compatibility
const MassNotifyMessagePayloadR = t.interface({
  message: t.string,

  title: t.string,
});
export const MassNotifyMessagePayloadLegacy = t.exact(
  MassNotifyMessagePayloadR,
);
export type MassNotifyMessagePayloadLegacy = t.TypeOf<
  typeof MassNotifyMessagePayloadLegacy
>;

const MassNotifyMessageR = t.interface({
  payload: MassNotifyMessagePayloadLegacy,
  template: NonEmptyString,
  tags: t.readonlyArray(NonEmptyString),
  kind: enumType<MassNotifyKind>(MassNotifyKind, "kind"),
});

const MassNotifyMessageO = t.partial({});

export const MassNotifyMessageLegacy = t.exact(
  t.intersection([MassNotifyMessageR, MassNotifyMessageO], "MassNotifyMessage"),
);
export type MassNotifyMessageLegacy = t.TypeOf<typeof MassNotifyMessageLegacy>;
