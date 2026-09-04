import {
  FiscalCode,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";

import { MalformedEntityError } from "../ports/error.js";
import { MessageContentRepository } from "../ports/message-content.js";
import {
  MessageMetadata,
  MessageMetadataRepository,
} from "../ports/message-metadata.js";
import { MessageReadAuthorizationRepository } from "../ports/message-read-authorization.js";
import { MessageStatusRepository } from "../ports/message-status.js";
import { PaymentStatusRepository } from "../ports/payment-status.js";
import { ServiceMessage } from "../ports/service-message.js";

const ADVANCED_READ_GROUP = "ApiMessageReadAdvanced";

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

export const makeGetServiceMessageUseCase =
  (
    messageMetadataRepository: MessageMetadataRepository,
    messageStatusRepository: MessageStatusRepository,
    messageContentRepository: MessageContentRepository,
    messageReadAuthorizationRepository: MessageReadAuthorizationRepository,
    paymentStatusRepository: PaymentStatusRepository,
  ): GetServiceMessageUseCase =>
  async ({ fiscalCode, groups, messageId, serviceId, subscriptionId }) => {
    const metadataResult =
      await messageMetadataRepository.getMessageMetadataByFiscalCodeAndId(
        fiscalCode,
        messageId,
      );
    if (metadataResult.isErr()) return err(metadataResult.error);

    const metadata = metadataResult.value;
    if (metadata.senderServiceId !== serviceId) {
      return err(new ForbiddenError());
    }

    const [contentResult, statusResult] = await Promise.all([
      messageContentRepository.getMessageContentById(messageId),
      messageStatusRepository.getLatestMessageStatusById(messageId),
    ]);

    if (
      contentResult.isErr() &&
      !(contentResult.error instanceof NotFoundError)
    ) {
      return err(contentResult.error);
    }
    if (
      statusResult.isErr() &&
      !(statusResult.error instanceof NotFoundError)
    ) {
      return err(statusResult.error);
    }

    const content = contentResult.isOk() ? contentResult.value : undefined;
    const status = statusResult.isOk() ? statusResult.value.status : "ACCEPTED";
    const response: ServiceMessage = {
      message: {
        ...(content ? { content } : {}),
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

    const authorizationResult =
      await messageReadAuthorizationRepository.canAccessReadStatus(
        subscriptionId,
        fiscalCode,
      );
    if (authorizationResult.isErr()) return err(authorizationResult.error);

    const advancedResponse: ServiceMessage = {
      ...response,
      read_status: authorizationResult.value
        ? statusResult.isOk() && statusResult.value.isRead
          ? "READ"
          : "UNREAD"
        : "UNAVAILABLE",
    };

    const paymentData = content?.payment_data;
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
