import { UserSessionInfo } from "@pagopa/io-backend-session-sdk/UserSessionInfo";
import { PushNotificationsContentTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/PushNotificationsContentType";
import { ReminderStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ReminderStatus";
import { RetrievedProfile } from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  AzureAllowBodyPayloadMiddleware,
  UserGroup,
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_api_auth";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler,
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessNoContent,
  ResponseErrorInternal,
  ResponseSuccessNoContent,
  getResponseErrorForbiddenNotAuthorized,
} from "@pagopa/ts-commons/lib/responses";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { match } from "ts-pattern";

import { NotificationInfo } from "../../generated/definitions/NotificationInfo";
import {
  NotificationType,
  NotificationTypeEnum,
} from "../../generated/definitions/NotificationType";
import {
  NotificationPrinter,
  getPrinterForTemplate,
} from "../../templates/printer";
import { toHash } from "../../utils/crypto";
import { ILogger, createLogger } from "../../utils/logger";
import { SendNotification } from "./notification";
import {
  MessageWithContentReader,
  ServiceReader,
  SessionStatusReader,
  UserProfileReader,
} from "./readers";

const isReminderNotification = (notificationType: NotificationType): boolean =>
  [
    NotificationTypeEnum.REMINDER_PAYMENT,
    NotificationTypeEnum.REMINDER_PAYMENT_LAST,
    NotificationTypeEnum.REMINDER_READ,
  ].includes(notificationType);

/**
 * Check whether a Reminder notification can be sent to user or not
 * NOTE: Right now we got no opt-in check. Always return true
 *
 * @param fiscalCode The user Fiscal Code
 * @returns
 */
const canSendReminderNotification = (
  retrievedUserProfile: RetrievedProfile,
): boolean =>
  // reminder is allowed only if user has explicitly enabled it
  retrievedUserProfile.reminderStatus === ReminderStatusEnum.ENABLED;

/**
 * Check whether a notification can be sent to user
 *
 * @param notificationType
 * @param fiscalCode
 * @returns a TaskEither of Error or boolean
 */
const checkSendNotificationPermission =
  (retrievedUserProfile: RetrievedProfile) =>
  (notificationType: NotificationType): boolean =>
    match(notificationType)
      .when(isReminderNotification, () =>
        canSendReminderNotification(retrievedUserProfile),
      )
      // Not implemented yet
      .otherwise(() => false);

/**
 * Check whether a notification should not contain personal information
 * depending on user' session status
 *
 * @param notificationType
 * @param fiscalCode
 * @returns a TaskEither of Error or boolean
 */
const canSendVerboseNotification = (
  userSessionInfo: UserSessionInfo,
  userProfile: RetrievedProfile,
): boolean =>
  userSessionInfo.active &&
  userProfile.pushNotificationsContentType ===
    PushNotificationsContentTypeEnum.FULL;

const prepareNotification =
  (
    logger: ILogger,
    userProfile: RetrievedProfile,
    retrieveUserSession: SessionStatusReader,
    retrieveMessageWithContent: MessageWithContentReader,
    retrieveService: ServiceReader,
  ) =>
  (
    notification_type: NotificationTypeEnum,
    fiscal_code: FiscalCode,
    message_id: NonEmptyString,
  ): TE.TaskEither<
    IResponseErrorInternal | IResponseErrorNotFound,
    NotificationPrinter
  > =>
    pipe(
      retrieveUserSession(fiscal_code),
      TE.map((userSession) => ({
        sendVerboseNotification: canSendVerboseNotification(
          userSession,
          userProfile,
        ),
        userSessionRetrieved: true,
      })),
      TE.orElse(() => {
        logger.warning(`Error retrieving user session, switch to anonymous`);
        return TE.of({
          sendVerboseNotification: false,
          userSessionRetrieved: false,
        });
      }),
      TE.bindW("messageWithContent", () =>
        pipe(
          retrieveMessageWithContent(fiscal_code, message_id),
          TE.mapLeft((response) => {
            logger.error(
              `Error retrieving message with content|${response.detail}`,
            );
            return response;
          }),
        ),
      ),
      TE.bindW("service", ({ messageWithContent }) =>
        pipe(
          retrieveService(messageWithContent.senderServiceId),
          TE.mapLeft((response) => {
            logger.error(`Error retrieving service|${response.detail}`);
            return response;
          }),
        ),
      ),
      TE.map((data) => ({
        ...data,
        sendVerboseNotification:
          data.sendVerboseNotification && !data.service.requireSecureChannels,
      })),
      TE.map((data) =>
        pipe(
          {
            hashedFiscalCode: toHash(fiscal_code) as NonEmptyString,
            messageId: message_id,
            notificationType: notification_type,
            userSessionRetrieved: data.userSessionRetrieved,
            verbose: data.sendVerboseNotification,
          },
          (properties) =>
            logger.trackEvent({
              name: "send-notification.info",
              properties,
            }),
          () => data,
        ),
      ),
      TE.map(({ messageWithContent, sendVerboseNotification, service }) => ({
        notificationEntry: {
          organizationName: service.organizationName,
          serviceName: service.serviceName,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore Ignore error: an IWithinRangeStringTag<10, 121> is an NonEmptyString for sure
          title: messageWithContent.content.subject as NonEmptyString,
        },
        printer: getPrinterForTemplate(notification_type),
        sendVerboseNotification,
      })),
      TE.map(({ notificationEntry, printer, sendVerboseNotification }) =>
        sendVerboseNotification
          ? printer.verbosePushPrinter(notificationEntry)
          : printer.silentPushPrinter(notificationEntry),
      ),
    );

// -------------------------------------
// NotifyHandler
// -------------------------------------

type NotifyHandler = (
  logger: ILogger,
  notificationInfo: NotificationInfo,
) => Promise<
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
  | IResponseErrorNotFound
  | IResponseSuccessNoContent
>;

const MessageNotificationInfo = t.interface({
  notification_type: t.literal(NotificationTypeEnum.MESSAGE),
});

const ReminderNotificationInfo = t.interface({
  notification_type: t.union([
    t.literal(NotificationTypeEnum.REMINDER_PAYMENT),
    t.literal(NotificationTypeEnum.REMINDER_PAYMENT_LAST),
    t.literal(NotificationTypeEnum.REMINDER_READ),
  ]),
});

export const NotifyHandler =
  (
    retrieveUserProfile: UserProfileReader,
    retrieveUserSession: SessionStatusReader,
    retrieveMessageWithContent: MessageWithContentReader,
    retrieveService: ServiceReader,
    sendNotification: SendNotification,
    // eslint-disable-next-line max-params
  ): NotifyHandler =>
  async (
    logger,
    { fiscal_code, message_id, notification_type },
  ): ReturnType<NotifyHandler> =>
    pipe(
      pipe(
        fiscal_code,
        retrieveUserProfile,
        TE.mapLeft((errorMsg) => {
          logger.error(`Error checking user preferences|${errorMsg}`);
          return ResponseErrorInternal("Error checking user preferences");
        }),
      ),
      TE.bindTo("userProfile"),
      TE.bindW("notificationPermission", ({ userProfile }) =>
        pipe(
          checkSendNotificationPermission(userProfile)(notification_type),
          TE.of,
        ),
      ),
      TE.chainW(
        TE.fromPredicate(
          ({ notificationPermission }) => notificationPermission,
          () => {
            logger.error(`Service is not allowed to send notification to user`);
            return getResponseErrorForbiddenNotAuthorized(
              "You're not allowed to send the notification",
            );
          },
        ),
      ),
      TE.chainW(({ userProfile }) =>
        prepareNotification(
          logger,
          userProfile,
          retrieveUserSession,
          retrieveMessageWithContent,
          retrieveService,
        )(notification_type, fiscal_code, message_id),
      ),
      TE.chainW(({ body, title }) =>
        pipe(
          sendNotification(fiscal_code, message_id, title, body),
          TE.mapLeft((err) => {
            logger.error(`Error while sending notification to queue|${err}`);
            return ResponseErrorInternal(
              "Error while sending notification to queue",
            );
          }),
        ),
      ),
      TE.map(() => ResponseSuccessNoContent()),
      TE.toUnion,
    )();

export const Notify = (
  retrieveUserProfile: UserProfileReader,
  retrieveUserSession: SessionStatusReader,
  retrieveMessageWithContent: MessageWithContentReader,
  retrieveService: ServiceReader,
  sendNotification: SendNotification,
  telemetryClient?: ReturnType<typeof initAppInsights>,
  // eslint-disable-next-line max-params
): express.RequestHandler => {
  const handler = NotifyHandler(
    retrieveUserProfile,
    retrieveUserSession,
    retrieveMessageWithContent,
    retrieveService,
    sendNotification,
  );
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(NotificationInfo),
    AzureAllowBodyPayloadMiddleware(
      MessageNotificationInfo,
      new Set([UserGroup.ApiNewMessageNotify]),
    ),
    AzureAllowBodyPayloadMiddleware(
      ReminderNotificationInfo,
      new Set([UserGroup.ApiReminderNotify]),
    ),
  );
  return wrapRequestHandler(
    middlewaresWrap((context, _) =>
      handler(createLogger(context, "Notify", telemetryClient), _),
    ),
  );
};
