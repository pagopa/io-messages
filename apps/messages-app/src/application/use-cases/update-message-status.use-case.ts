import {
  ConflictError,
  FiscalCode,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";

import {
  MessageStatus,
  MessageStatusRepository,
  createMessageStatusId,
} from "../ports/message-status.js";

type MessageStatusFlagsUpdate =
  | { isArchived: boolean; isRead?: boolean }
  | { isArchived?: boolean; isRead: boolean };

export type UpdateMessageStatusInput = {
  fiscalCode: FiscalCode;
  messageId: string;
} & MessageStatusFlagsUpdate;

export type UpdateMessageStatusError =
  | ConflictError
  | ForbiddenError
  | GenericError
  | NotFoundError
  | TooManyRequestsError;

export type UpdateMessageStatusUseCase = UseCase<
  UpdateMessageStatusInput,
  MessageStatus,
  UpdateMessageStatusError
>;

export const makeUpdateMessageStatusUseCase =
  (
    messageStatusRepository: MessageStatusRepository,
  ): UpdateMessageStatusUseCase =>
  async ({ fiscalCode, isArchived, isRead, messageId }) => {
    const latestStatusResult =
      await messageStatusRepository.getLatestMessageStatusById(messageId);

    if (latestStatusResult.isErr()) {
      if (latestStatusResult.error instanceof NotFoundError) {
        return err(latestStatusResult.error);
      }
      if (
        latestStatusResult.error instanceof GenericError ||
        latestStatusResult.error instanceof TooManyRequestsError
      ) {
        return err(latestStatusResult.error);
      }
      return err(new GenericError(latestStatusResult.error.message));
    }

    const latestStatus = latestStatusResult.value;
    if (latestStatus.fiscalCode !== fiscalCode) {
      return err(new ForbiddenError());
    }

    const version = latestStatus.version + 1;
    const newStatus: MessageStatus = {
      ...latestStatus,
      ...(isArchived === undefined ? {} : { isArchived }),
      ...(isRead === undefined ? {} : { isRead }),
      fiscalCode,
      id: createMessageStatusId(latestStatus.messageId, version),
      updatedAt: new Date().toISOString(),
      version,
    };

    const createResult =
      await messageStatusRepository.createMessageStatus(newStatus);
    if (createResult.isErr()) {
      return err(createResult.error);
    }

    return ok(createResult.value);
  };
