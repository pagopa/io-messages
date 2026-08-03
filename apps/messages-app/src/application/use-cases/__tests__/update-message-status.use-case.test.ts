import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type {
  MessageStatus,
  MessageStatusRepository,
} from "../../ports/message-status.js";

import {
  MalformedEntityError,
  MessageStatusVersionConflictError,
} from "../../ports/error.js";
import { makeUpdateMessageStatusUseCase } from "../update-message-status.use-case.js";

const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const updatedAt = new Date("2024-02-03T04:05:06.000Z");
const latestStatus: MessageStatus = {
  id: `${messageId}-0000000000000000`,
  isArchived: true,
  isRead: false,
  messageId,
  status: "PROCESSED",
  updatedAt: "2023-01-01T00:00:00.000Z",
  version: 0,
};

const makeRepository = (): MessageStatusRepository => ({
  createMessageStatus: vi.fn().mockResolvedValue(ok(latestStatus)),
  getLatestMessageStatusById: vi.fn().mockResolvedValue(ok(latestStatus)),
  getLatestMessagesStatusByIds: vi.fn().mockResolvedValue(ok([latestStatus])),
});

describe("makeUpdateMessageStatusUseCase", () => {
  it("creates the next immutable version with the requested flags", async () => {
    const repository = makeRepository();
    const expectedStatus: MessageStatus = {
      ...latestStatus,
      id: `${messageId}-0000000000000001`,
      isArchived: false,
      isRead: true,
      updatedAt: updatedAt.toISOString(),
      version: 1,
    };
    vi.mocked(repository.createMessageStatus).mockResolvedValue(
      ok(expectedStatus),
    );
    const useCase = makeUpdateMessageStatusUseCase(repository, () => updatedAt);

    const result = await useCase({
      isArchived: false,
      isRead: true,
      messageId,
    });

    expect(result._unsafeUnwrap()).toEqual(expectedStatus);
    expect(repository.getLatestMessageStatusById).toHaveBeenCalledWith(
      messageId,
    );
    expect(repository.createMessageStatus).toHaveBeenCalledWith(expectedStatus);
    expect(latestStatus).toEqual({
      id: `${messageId}-0000000000000000`,
      isArchived: true,
      isRead: false,
      messageId,
      status: "PROCESSED",
      updatedAt: "2023-01-01T00:00:00.000Z",
      version: 0,
    });
  });

  it.each([
    [
      { isArchived: false, messageId },
      { isArchived: false, isRead: false },
    ],
    [
      { isRead: true, messageId },
      { isArchived: true, isRead: true },
    ],
  ])("updates only the provided flag", async (input, expectedFlags) => {
    const repository = makeRepository();
    const useCase = makeUpdateMessageStatusUseCase(repository, () => updatedAt);

    await useCase(input);

    expect(repository.createMessageStatus).toHaveBeenCalledWith(
      expect.objectContaining(expectedFlags),
    );
  });

  it.each([
    new GenericError("read failed"),
    new MalformedEntityError("invalid status"),
    new NotFoundError("message status", "missing"),
    new TooManyRequestsError(),
  ])("propagates latest-status errors", async (error) => {
    const repository = makeRepository();
    vi.mocked(repository.getLatestMessageStatusById).mockResolvedValue(
      err(error),
    );
    const useCase = makeUpdateMessageStatusUseCase(repository, () => updatedAt);

    const result = await useCase({ isRead: true, messageId });

    expect(result._unsafeUnwrapErr()).toBe(error);
    expect(repository.createMessageStatus).not.toHaveBeenCalled();
  });

  it.each([
    new GenericError("create failed"),
    new MessageStatusVersionConflictError(messageId, 1),
    new TooManyRequestsError(),
  ])("propagates create errors", async (error) => {
    const repository = makeRepository();
    vi.mocked(repository.createMessageStatus).mockResolvedValue(err(error));
    const useCase = makeUpdateMessageStatusUseCase(repository, () => updatedAt);

    const result = await useCase({ isArchived: false, messageId });

    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
