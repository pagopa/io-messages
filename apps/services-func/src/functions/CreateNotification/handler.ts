import { BlockedInboxOrChannelEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/BlockedInboxOrChannel";
import { FiscalCode } from "@pagopa/io-functions-commons/dist/generated/definitions/FiscalCode";
import { HttpsUrl } from "@pagopa/io-functions-commons/dist/generated/definitions/HttpsUrl";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { NotificationChannelEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotificationChannel";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { ServicesPreferencesModeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ServicesPreferencesMode";
import { CreatedMessageEventSenderMetadata } from "@pagopa/io-functions-commons/dist/src/models/created_message_sender_metadata";
import { NewMessageWithoutContent } from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  NewNotification,
  NotificationAddressSourceEnum,
  NotificationChannelEmail,
  NotificationModel,
  createNewNotification,
} from "@pagopa/io-functions-commons/dist/src/models/notification";
import { NotificationEvent } from "@pagopa/io-functions-commons/dist/src/models/notification_event";
import { RetrievedProfile } from "@pagopa/io-functions-commons/dist/src/models/profile";
import { ulidGenerator } from "@pagopa/io-functions-commons/dist/src/utils/strings";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { Option } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import {
  CommonMessageData,
  NotificationCreatedEvent,
  ProcessedMessageEvent,
} from "../../utils/events/message";
import { withDecodedInput } from "../../utils/with-decoded-input";
import {
  DataFetcher,
  withExpandedInput,
} from "../../utils/with-expanded-input";
import { withJsonInput } from "../../utils/with-json-input";

/**
 * Attempt to resolve an email address from
 * the recipient profile.
 */
const getEmailAddressFromProfile = (
  profile: RetrievedProfile,
): Option<NotificationChannelEmail> =>
  pipe(
    profile.email,
    O.fromNullable,
    O.map((email) => ({
      addressSource: NotificationAddressSourceEnum.PROFILE_ADDRESS,
      toAddress: email,
    })),
  );

/**
 * Try to create (save) a new notification
 */
async function createNotification(
  lNotificationModel: NotificationModel,
  senderMetadata: CreatedMessageEventSenderMetadata,
  newMessageWithoutContent: NewMessageWithoutContent,
  newMessageContent: MessageContent,
  newNotification: NewNotification,
): Promise<NotificationEvent> {
  const errorOrNotification =
    await lNotificationModel.create(newNotification)();

  if (E.isLeft(errorOrNotification)) {
    throw new Error(
      `Cannot save notification to database: ${errorOrNotification.left}`,
    );
  }

  const notification = errorOrNotification.right;

  return {
    content: newMessageContent,
    message: newMessageWithoutContent,
    notificationId: notification.id,
    senderMetadata,
  };
}

export type CreateNotificationInput = t.TypeOf<typeof CreateNotificationInput>;
export const CreateNotificationInput = ProcessedMessageEvent;

/**
 * Returns a function for handling createNotification
 */
// eslint-disable-next-line max-lines-per-function,@typescript-eslint/explicit-function-return-type
export const getCreateNotificationHandler = (
  lNotificationModel: NotificationModel,
  lDefaultWebhookUrl: HttpsUrl,
  lSandboxFiscalCode: FiscalCode,
  lEmailNotificationServiceBlackList: readonly ServiceId[],
  retrieveProcessingMessageData: DataFetcher<CommonMessageData>,
  // eslint-disable-next-line max-params
) =>
  // eslint-disable-next-line max-lines-per-function
  withJsonInput(
    withDecodedInput(
      CreateNotificationInput,
      withExpandedInput(
        "messageId",
        retrieveProcessingMessageData,
        async (
          context,
          {
            blockedInboxOrChannels,
            content: newMessageContent,
            message: newMessageWithoutContent,
            messageId,
            profile,
            senderMetadata,
          },
        ) => {
          const logPrefix = `${context.executionContext.functionName}|MESSAGE_ID=${newMessageWithoutContent.id}`;

          context.log.verbose(`${logPrefix}|STARTING`);

          //
          // Decide whether to send an email notification
          //

          // first we check whether the user has blocked emails notifications for the
          // service that is sending the message
          // Since we are not handling email service preferences for App version 1.29.0.1
          // not Legacy profiles will use only profile level email preference.
          const isEmailBlockedForService =
            profile.servicePreferencesSettings.mode ===
              ServicesPreferencesModeEnum.LEGACY &&
            blockedInboxOrChannels.includes(BlockedInboxOrChannelEnum.EMAIL);

          // If the message is sent to the SANDBOX_FISCAL_CODE we consider it a test message
          // so we send the email notification to the email associated to the user owner
          // of the sender service (the one registered in the developer portal).
          // Otherwise we try to get the email from the user profile.
          const maybeNotificationEmailAddress: Option<NotificationChannelEmail> =
            newMessageWithoutContent.fiscalCode === lSandboxFiscalCode
              ? O.some({
                  addressSource:
                    NotificationAddressSourceEnum.SERVICE_USER_ADDRESS,
                  toAddress: senderMetadata.serviceUserEmail,
                })
              : getEmailAddressFromProfile(profile);

          // the sender service allows email channel
          const isEmailChannelAllowed = !senderMetadata.requireSecureChannels;

          // wether the service is in our blacklist for sending email
          const isEmailDisabledForService =
            lEmailNotificationServiceBlackList.includes(
              newMessageWithoutContent.senderServiceId,
            );

          // whether email notifications are enabled in this user profile - this is
          // true by default, it's false only for users that have isEmailEnabled = false
          // in their profile.
          // Email is enabled if the message is sent to the SANDBOX_FISCAL_CODE
          const isEmailEnabledInProfile =
            newMessageWithoutContent.fiscalCode === lSandboxFiscalCode ||
            profile.isEmailEnabled !== false;

          // Check if the email in the user profile is validated.
          // we assume it's true when not defined in user's profile.
          // Email is validated if the message is sent to the SANDBOX_FISCAL_CODE
          const isEmailValidatedInProfile =
            newMessageWithoutContent.fiscalCode === lSandboxFiscalCode ||
            profile.isEmailValidated !== false;

          // finally we decide whether we should send the email notification or not -
          // we send an email notification when all the following conditions are met:
          //
          // * email notifications are enabled for this service (!isInBlackList)
          // * email notifications are enabled in the user profile (isEmailEnabledInProfile)
          // * email is validated in the user profile (isEmailValidatedInProfile)
          // * email notifications are not blocked for the sender service (!isEmailBlockedForService)
          // * the sender service allows email channel
          // * a destination email address is configured (maybeNotificationEmailAddress)
          //

          const maybeEmailNotificationAddress =
            !isEmailDisabledForService &&
            isEmailEnabledInProfile &&
            isEmailValidatedInProfile &&
            !isEmailBlockedForService &&
            isEmailChannelAllowed
              ? maybeNotificationEmailAddress
              : O.none;

          context.log.verbose(
            `${logPrefix}|CHANNEL=EMAIL|PROFILE_ENABLED=${isEmailEnabledInProfile}|SERVICE_BLOCKED=${isEmailBlockedForService}|PROFILE_EMAIL=${O.isSome(
              maybeEmailNotificationAddress,
            )}|WILL_NOTIFY=${O.isSome(maybeEmailNotificationAddress)}`,
          );

          //
          //  Decide whether to send a webhook notification
          //

          // whether the recipient wants us to send notifications to the app backend
          const isWebhookEnabledInProfile = profile.isWebhookEnabled === true;

          // check if the user has blocked webhook notifications sent from this service
          const isWebhookBlockedForService =
            blockedInboxOrChannels.indexOf(BlockedInboxOrChannelEnum.WEBHOOK) >=
            0;

          // finally we decide whether we should send the webhook notification or not -
          // we send a webhook notification when all the following conditions are met:
          //
          // * webhook notifications are enabled in the user profile (isWebhookEnabledInProfile)
          // * webhook notifications are not blocked for the sender service (!isWebhookBlockedForService)
          // * webhook notifications are not blacklisted for the sender service (!isWebhookDisabledForService)
          //
          const maybeWebhookNotificationUrl =
            isWebhookEnabledInProfile && !isWebhookBlockedForService
              ? O.some({
                  url: lDefaultWebhookUrl,
                })
              : O.none;

          context.log.verbose(
            `${logPrefix}|CHANNEL=WEBHOOK|CHANNEL_ENABLED=${isWebhookEnabledInProfile}|SERVICE_BLOCKED=${isWebhookBlockedForService}|WILL_NOTIFY=${O.isSome(
              maybeWebhookNotificationUrl,
            )}`,
          );

          //
          // If we can't send any notification there's not point in creating a
          // Notification object
          //

          const noChannelsConfigured =
            O.isNone(maybeEmailNotificationAddress) &&
            O.isNone(maybeWebhookNotificationUrl);

          if (noChannelsConfigured) {
            context.log.warn(`${logPrefix}|RESULT=NO_CHANNELS_ENABLED`);
            // return no notifications
            return;
          }

          //
          // Create a Notification object to track the status of each notification
          //

          const newNotification: NewNotification = {
            ...createNewNotification(
              ulidGenerator,
              newMessageWithoutContent.fiscalCode,
              newMessageWithoutContent.id,
            ),
            channels: {
              [NotificationChannelEnum.EMAIL]: O.toUndefined(
                maybeEmailNotificationAddress,
              ),
              [NotificationChannelEnum.WEBHOOK]: O.toUndefined(
                maybeWebhookNotificationUrl,
              ),
            },
          };

          const createdNotification = await createNotification(
            lNotificationModel,
            senderMetadata,
            newMessageWithoutContent,
            newMessageContent,
            newNotification,
          );

          context.log.verbose(`${logPrefix}|RESULT=SUCCESS`);

          if (O.isSome(maybeEmailNotificationAddress)) {
            context.bindings.notificationCreatedEmail =
              NotificationCreatedEvent.encode({
                messageId,
                notificationId: createdNotification.notificationId,
              });
          }

          if (O.isSome(maybeWebhookNotificationUrl)) {
            context.bindings.notificationCreatedWebhook =
              NotificationCreatedEvent.encode({
                messageId,
                notificationId: createdNotification.notificationId,
              });
          }
        },
      ),
    ),
  );
