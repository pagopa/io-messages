import { errorsToReadableMessages } from "@pagopa/ts-commons/lib/reporters";
import { TelemetryClient } from "applicationinsights";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import {
  Failure,
  throwTransientFailure,
  toPermanentFailure,
  toTransientFailure,
} from "../../utils/errors";
import { massNotify } from "../../utils/notification";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";
import { NhMassNotifyMessageRequest } from "../../utils/types";

const errorsToError = (errors: t.Errors): Error =>
  new Error(errorsToReadableMessages(errors).join(" / "));

export type NhMassNotifyMessageResponse = Promise<
  { readonly kind: string } | Failure
>;

export const handle = (
  inputRequest: unknown,
  telemetryClient: TelemetryClient,
  nhPartitionFactory: NotificationHubPartitionFactory,
): NhMassNotifyMessageResponse =>
  pipe(
    inputRequest,
    t.string.decode,
    E.map((inputRequestAsBase64) =>
      Buffer.from(inputRequestAsBase64, "base64").toString(),
    ),
    E.map(JSON.parse),
    E.chain(NhMassNotifyMessageRequest.decode),
    E.mapLeft(flow(errorsToError, toPermanentFailure)),
    TE.fromEither,
    TE.bindTo("request"),
    TE.chain(({ request: { message } }) =>
      pipe(
        massNotify(
          nhPartitionFactory.getAllPartitions(),
          message.template,
          message.tags,
          message.payload,
          telemetryClient,
        ),
        TE.map(() => ({ kind: "SUCCESS", skipped: false })),
        TE.mapLeft(toTransientFailure),
        TE.mapLeft((error) => {
          telemetryClient.trackEvent({
            name: "api.messages.notification.push.sent.failure",
            properties: {
              isSuccess: "false",
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
              isSuccess: "true",
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
