import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { enumType } from "@pagopa/ts-commons/lib/types";

export enum MassNotifyKind {
  "Generic" = "Generic",
}

const MassNotifyMessagePayloadR = t.interface({
  message: t.string,

  title: t.string,
});
export const MassNotifyMessagePayload = t.exact(MassNotifyMessagePayloadR);
export type MassNotifyMessagePayload = t.TypeOf<
  typeof MassNotifyMessagePayload
>;

// export type MassNotifyMessage = {
//   payload: {
//     message: string;
//     title: string;
//   } & {};
//   template: NonEmptyString;
//   tags: ReadonlyArray<NonEmptyString>;
//   kind: MassNotifyKind;
// };
const MassNotifyMessageR = t.interface({
  payload: MassNotifyMessagePayload,
  template: NonEmptyString,
  tags: t.readonlyArray(NonEmptyString),
  kind: enumType<MassNotifyKind>(MassNotifyKind, "kind"),
});

export const MassNotifyMessage = t.exact(MassNotifyMessageR);
export type MassNotifyMessage = t.TypeOf<typeof MassNotifyMessage>;

// const NotifyMessageR = t.interface({
//   installationId: InstallationId,

//   payload: NotifyMessagePayload,

//   kind: enumType<KindEnum>(KindEnum, "kind")
// });

// // optional attributes
// const NotifyMessageO = t.partial({});

// export const NotifyMessage = t.exact(
//   t.intersection([NotifyMessageR, NotifyMessageO], "NotifyMessage")
// );

// export type NotifyMessage = t.TypeOf<typeof NotifyMessage>;
