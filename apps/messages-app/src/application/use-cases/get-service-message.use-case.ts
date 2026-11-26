import {
  FiscalCode,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";
import { clean, gte } from "semver";

import { MalformedEntityError } from "../ports/error.js";
import { MessageContentRepository } from "../ports/message-content.js";
import {
  MessageMetadata,
  MessageMetadataRepository,
} from "../ports/message-metadata.js";
import {
  MessageStatus,
  MessageStatusRepository,
} from "../ports/message-status.js";
import { PaymentStatusRepository } from "../ports/payment-status.js";
import { ProfileRepository } from "../ports/profile.js";
import { ServiceMessage } from "../ports/service-message.js";
import { ServicePreferencesRepository } from "../ports/service-preferences.js";

const ADVANCED_READ_GROUP = "ApiMessageReadAdvanced";

type MessageContentFields = Pick<ServiceMessage["message"], "content">;
type MessageStatusFields = Pick<MessageStatus, "isRead" | "status">;

export type GetServiceMessageError =
  | ForbiddenError
  | GenericError
  | MalformedEntityError
  | NotFoundError
  | TooManyRequestsError;

export interface GetServiceMessageInput {
  readonly fiscalCode: FiscalCode;
  readonly groups: ReadonlySet<string>;
  readonly messageId: string;
  readonly serviceId: string;
  readonly subscriptionId: string;
}

export type GetServiceMessageUseCase = UseCase<
  GetServiceMessageInput,
  ServiceMessage,
  GetServiceMessageError
>;

const canReadAdvancedMessageInfo = (
  metadata: MessageMetadata,
  groups: ReadonlySet<string>,
): boolean =>
  !metadata.isPending &&
  metadata.featureLevelType === "ADVANCED" &&
  groups.has(ADVANCED_READ_GROUP);

const canAccessReadStatus = async (
  profileRepository: ProfileRepository,
  servicePreferencesRepository: ServicePreferencesRepository,
  minAppVersion: string,
  subscriptionId: string,
  fiscalCode: FiscalCode,
): Promise<Result<boolean, GenericError | MalformedEntityError>> => {
  const profileResult = await profileRepository.getProfile(fiscalCode);
  if (profileResult.isErr()) return err(profileResult.error);

  const profile = profileResult.value;
  const currentVersion = clean(
    profile.lastAppVersion.split(".").slice(0, 3).join("."),
  );
  if (!currentVersion || !gte(currentVersion, minAppVersion)) {
    return ok(false);
  }

  const settingsVersion = profile.servicePreferencesSettings.version;
  if (settingsVersion === -1) return ok(false);

  const preferencesResult =
    await servicePreferencesRepository.getServicePreferences(
      fiscalCode,
      subscriptionId,
      settingsVersion,
    );
  if (preferencesResult.isErr()) {
    return preferencesResult.error instanceof NotFoundError
      ? ok(true)
      : err(preferencesResult.error);
  }

  return ok(preferencesResult.value.accessReadMessageStatus !== "DENY");
};

export const makeGetMessageForServiceUseCase =
  (
    messageMetadataRepository: MessageMetadataRepository,
    messageStatusRepository: MessageStatusRepository,
    messageContentRepository: MessageContentRepository,
    profileRepository: ProfileRepository,
    servicePreferencesRepository: ServicePreferencesRepository,
    paymentStatusRepository: PaymentStatusRepository,
    minAppVersionWithReadAuth: string,
  ): GetServiceMessageUseCase =>
  async ({ fiscalCode, groups, messageId, serviceId, subscriptionId }) => {
    const metadataResult = await messageMetadataRepository.getMessageMetadata(
      fiscalCode,
      messageId,
    );
    if (metadataResult.isErr()) return err(metadataResult.error);

    const metadata = metadataResult.value;
    if (metadata.senderServiceId !== serviceId) {
      return err(new ForbiddenError());
    }

    const [contentReadResult, statusReadResult] = await Promise.all([
      messageContentRepository.getMessageContentById(messageId),
      messageStatusRepository.getLatestMessageStatusById(messageId),
    ]);

    // A 404 is expected when:
    // - asynchronous processing has created metadata but not content/status yet;
    // - processing rejected the message without storing its content.
    // Omit missing content and default a missing status to ACCEPTED.
    const contentResult = contentReadResult
      .map<MessageContentFields>((content) => ({ content }))
      .orElse((error) =>
        error instanceof NotFoundError
          ? ok<MessageContentFields>({})
          : err(error),
      );
    const statusResult = statusReadResult
      .map<MessageStatusFields>(({ isRead, status }) => ({ isRead, status }))
      .orElse((error) =>
        error instanceof NotFoundError
          ? ok<MessageStatusFields>({ isRead: false, status: "ACCEPTED" })
          : err(error),
      );

    if (contentResult.isErr()) return err(contentResult.error);
    if (statusResult.isErr()) return err(statusResult.error);

    const { isRead, status } = statusResult.value;
    const response: ServiceMessage = {
      message: {
        ...contentResult.value,
        created_at: metadata.createdAt,
        feature_level_type: metadata.featureLevelType,
        fiscal_code: metadata.fiscalCode,
        id: metadata.id,
        sender_service_id: metadata.senderServiceId,
        time_to_live: metadata.timeToLiveSeconds,
      },
      status,
    };

    const canReadAdvancedInfo = canReadAdvancedMessageInfo(metadata, groups);
    if (!canReadAdvancedInfo) return ok(response);

    const authorizationResult = await canAccessReadStatus(
      profileRepository,
      servicePreferencesRepository,
      minAppVersionWithReadAuth,
      subscriptionId,
      fiscalCode,
    );
    if (authorizationResult.isErr()) return err(authorizationResult.error);

    const advancedResponse: ServiceMessage = {
      ...response,
      read_status: authorizationResult.value
        ? isRead
          ? "READ"
          : "UNREAD"
        : "UNAVAILABLE",
    };

    const paymentData = response.message.content?.payment_data;
    const payeeFiscalCode = paymentData?.payee?.fiscal_code;
    if (status !== "PROCESSED" || !paymentData || !payeeFiscalCode) {
      return ok(advancedResponse);
    }

    const paymentStatusResult = await paymentStatusRepository.getPaymentStatus(
      `${payeeFiscalCode}${paymentData.notice_number}`,
    );
    if (paymentStatusResult.isErr()) return err(paymentStatusResult.error);

    return ok({
      ...advancedResponse,
      payment_status: paymentStatusResult.value,
    });
  };
