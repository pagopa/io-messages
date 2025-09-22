import { aValidMessageStatus } from "@/__mocks__/message-status.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { IngestMessageStatusUseCase } from "../ingest-message-status.js";

const publishMock = vi.fn();

const ingestUseCase = new IngestMessageStatusUseCase({ publish: publishMock });
const messageStatusBatch = [aValidMessageStatus];

describe("ingestMessageStatusUseCase execute", () => {
  beforeEach(() => {
    publishMock.mockClear();
  });

  test("Should call the publish method with 1 element", async () => {
    await expect(ingestUseCase.execute(messageStatusBatch)).resolves.toBe(
      undefined,
    );
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith([
      {
        created_at: new Date(aValidMessageStatus.updatedAt).getTime(),
        id: aValidMessageStatus.id,
        is_archived: aValidMessageStatus.isArchived,
        is_read: aValidMessageStatus.isRead,
        message_id: aValidMessageStatus.messageId,
        op: "CREATE",
        schema_version: 1,
        status: aValidMessageStatus.status,
        version: aValidMessageStatus.version,
      },
    ]);
  });

  test("Should filter rejection reason USER_NOT_FOUND", async () => {
    await expect(
      ingestUseCase.execute([
        aValidMessageStatus,
        {
          ...aValidMessageStatus,
          id: "01FZ8Z7G6X6Z4XG5Y6Z7Z8Z9Z0",
          status: "REJECTED",
          rejection_reason: "USER_NOT_FOUND",
        },
      ]),
    ).resolves.toBe(undefined);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith([
      {
        created_at: new Date(aValidMessageStatus.updatedAt).getTime(),
        id: aValidMessageStatus.id,
        is_archived: aValidMessageStatus.isArchived,
        is_read: aValidMessageStatus.isRead,
        message_id: aValidMessageStatus.messageId,
        op: "CREATE",
        schema_version: 1,
        status: aValidMessageStatus.status,
        version: aValidMessageStatus.version,
      },
    ]);
  });
});
