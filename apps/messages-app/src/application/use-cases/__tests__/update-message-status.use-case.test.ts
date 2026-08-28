import {
  ConflictError,
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  MessageStatus,
  MessageStatusRepository,
} from "../../ports/message-status.js";

import { MalformedEntityError } from "../../ports/error.js";
import { makeUpdateMessageStatusUseCase } from "../update-message-status.use-case.js";

const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const fiscalCode = "RSSMRA80A01H501U";
const updatedAt = new Date("2024-02-03T04:05:06.000Z");
const latestStatus: MessageStatus = {
  fiscalCode,
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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(updatedAt);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    const useCase = makeUpdateMessageStatusUseCase(repository);

    const result = await useCase({
      fiscalCode,
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
      fiscalCode,
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
      { fiscalCode, isArchived: false, messageId },
      { isArchived: false, isRead: false },
    ],
    [
      { fiscalCode, isRead: true, messageId },
      { isArchived: true, isRead: true },
    ],
  ])("updates only the provided flag", async (input, expectedFlags) => {
    const repository = makeRepository();
    const useCase = makeUpdateMessageStatusUseCase(repository);

    await useCase(input);

    expect(repository.createMessageStatus).toHaveBeenCalledWith(
      expect.objectContaining(expectedFlags),
    );
  });

  it("returns forbidden without writing when the status belongs to another user", async () => {
    const repository = makeRepository();
    const useCase = makeUpdateMessageStatusUseCase(repository);

    const result = await useCase({
      fiscalCode: "FRMTTR76M06B715E",
      isRead: true,
      messageId,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expect(repository.createMessageStatus).not.toHaveBeenCalled();
  });

  it("returns forbidden without writing when the legacy status has no owner", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getLatestMessageStatusById).mockResolvedValue(
      ok({ ...latestStatus, fiscalCode: undefined }),
    );
    const useCase = makeUpdateMessageStatusUseCase(repository);

    const result = await useCase({ fiscalCode, isRead: true, messageId });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expect(repository.createMessageStatus).not.toHaveBeenCalled();
  });

  it.each([
    [new GenericError("read failed"), GenericError],
    [new MalformedEntityError("invalid status"), GenericError],
    [new NotFoundError("message status", "missing"), NotFoundError],
    [new TooManyRequestsError(), GenericError],
  ])(
    "maps latest-status errors for legacy HTTP parity",
    async (error, kind) => {
      const repository = makeRepository();
      vi.mocked(repository.getLatestMessageStatusById).mockResolvedValue(
        err(error),
      );
      const useCase = makeUpdateMessageStatusUseCase(repository);

      const result = await useCase({ fiscalCode, isRead: true, messageId });

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(kind);
      expect(repository.createMessageStatus).not.toHaveBeenCalled();
    },
  );

  it.each([
    [new GenericError("create failed"), GenericError],
    [new ConflictError(messageId), GenericError],
    [new TooManyRequestsError(), GenericError],
  ])("maps create errors to internal errors", async (error, kind) => {
    const repository = makeRepository();
    vi.mocked(repository.createMessageStatus).mockResolvedValue(err(error));
    const useCase = makeUpdateMessageStatusUseCase(repository);

    const result = await useCase({
      fiscalCode,
      isArchived: false,
      messageId,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(kind);
  });
});
