import type {
  ConflictError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
} from "@pagopa/hexagonal-core";

import { err } from "neverthrow";

import type { MalformedEntityError } from "../ports/error.js";

import {
  MessageStatus,
  MessageStatusRepository,
  createMessageStatusId,
} from "../ports/message-status.js";

type MessageStatusFlagsUpdate =
  | { isArchived: boolean; isRead?: boolean }
  | { isArchived?: boolean; isRead: boolean };

export type UpdateMessageStatusInput = {
  messageId: string;
} & MessageStatusFlagsUpdate;

export type UpdateMessageStatusError =
  | ConflictError
  | GenericError
  | MalformedEntityError
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
  async ({ isArchived, isRead, messageId }) => {
    const latestStatusResult =
      await messageStatusRepository.getLatestMessageStatusById(messageId);

    if (latestStatusResult.isErr()) {
      return err(latestStatusResult.error);
    }

    const latestStatus = latestStatusResult.value;
    const version = latestStatus.version + 1;
    const newStatus: MessageStatus = {
      ...latestStatus,
      ...(isArchived === undefined ? {} : { isArchived }),
      ...(isRead === undefined ? {} : { isRead }),
      id: createMessageStatusId(latestStatus.messageId, version),
      updatedAt: new Date().toISOString(),
      version,
    };

    return await messageStatusRepository.createMessageStatus(newStatus);
  };
