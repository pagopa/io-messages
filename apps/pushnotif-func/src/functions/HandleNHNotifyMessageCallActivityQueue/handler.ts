import { errorsToReadableMessages } from "@pagopa/ts-commons/lib/reporters";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { toSHA256 } from "../../utils/conversions";
import {
  Failure,
  throwTransientFailure,
  toPermanentFailure,
  toTransientFailure,
} from "../../utils/errors";
import { notify } from "../../utils/notification";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";
import { NhNotifyMessageRequest } from "../../utils/types";

const errorsToError = (errors: t.Errors): Error =>
  new Error(errorsToReadableMessages(errors).join(" / "));

export type NhNotifyMessageResponse = Promise<
  { readonly kind: string } | Failure
>;

export const handle = (
  inputRequest: unknown,
  fiscalCodeNotificationBlacklist: readonly FiscalCode[],
  telemetryClient: TelemetryClient,
  nhPartitionFactory: NotificationHubPartitionFactory,
  newNhPartitionFactory: NotificationHubPartitionFactory,
  useNewPartition: (i: string) => boolean,
): NhNotifyMessageResponse =>
  pipe(
    inputRequest,
    t.string.decode,
    E.map((inputRequestAsBase64) =>
      Buffer.from(inputRequestAsBase64, "base64").toString(),
    ),
    E.map(JSON.parse),
    E.chain(NhNotifyMessageRequest.decode),
    E.mapLeft(flow(errorsToError, toPermanentFailure)),
    TE.fromEither,
    TE.bindTo("request"),
    TE.chain(({ request: { message } }) =>
      pipe(
        { kind: "SUCCESS", skipped: true },
        TE.fromPredicate(
          () =>
            fiscalCodeNotificationBlacklist
              .map(toSHA256)
              .includes(message.installationId),
          () => "execute notify",
        ),
        TE.orElseW(() =>
          pipe(
            notify(
              useNewPartition(message.installationId)
                ? newNhPartitionFactory.getPartition(message.installationId)
                : nhPartitionFactory.getPartition(message.installationId),
              message.payload,
              message.installationId,
              telemetryClient,
            ),
            TE.map(() => ({ kind: "SUCCESS", skipped: false })),
          ),
        ),
        TE.mapLeft(toTransientFailure),
        TE.mapLeft((error) => {
          telemetryClient.trackEvent({
            name: "api.messages.notification.push.sent.failure",
            properties: {
              installationId: message.installationId,
              isSuccess: "false",
              messageId: message.payload.message_id,
              reason: error.reason,
            },
            tagOverrides: { samplingEnabled: "false" },
          });

          return error;
        }),
        TE.map((result) => {
          telemetryClient.trackEvent({
            name: "api.messages.notification.push.sent",
            properties: {
              dryRun: !!result.skipped,
              installationId: message.installationId,
              isSuccess: "true",
              messageId: message.payload.message_id,
            },
            tagOverrides: { samplingEnabled: "false" },
          });

          return result;
        }),
      ),
    ),
    TE.mapLeft(throwTransientFailure),
    TE.toUnion,
  )();
