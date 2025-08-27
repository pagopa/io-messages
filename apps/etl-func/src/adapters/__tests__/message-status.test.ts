import { aValidMessageStatus } from "@/__mocks__/message-status.js";
import { getMessageStatusEvent } from "@/domain/message-status-event.js";
import { describe, expect, test } from "vitest";

describe("getMessageStatusEventFromMessage", () => {
  test("Given a valid MessageStatus it should not throw", () => {
    expect(() => getMessageStatusEvent(aValidMessageStatus)).not.toThrow();
  });

  test("Given a valid MessageStatus, when the version is 0 it should return a valid MessageStatusEvent with op CREATE", () => {
    expect(getMessageStatusEvent(aValidMessageStatus)).toMatchObject({
      created_at: new Date(aValidMessageStatus.updatedAt).getTime(),
      id: aValidMessageStatus.id,
      is_archived: aValidMessageStatus.isArchived,
      is_read: aValidMessageStatus.isRead,
      message_id: aValidMessageStatus.messageId,
      op: "CREATE",
      schema_version: 1,
      status: aValidMessageStatus.status,
      version: aValidMessageStatus.version,
    });
  });

  test("Given a valid MessageStatus, when the version is 1  it should return a valid MessageStatusEvent with op UPDATE", () => {
    expect(
      getMessageStatusEvent({
        ...aValidMessageStatus,
        version: 1,
      }),
    ).toMatchObject({
      created_at: new Date(aValidMessageStatus.updatedAt).getTime(),
      id: aValidMessageStatus.id,
      is_archived: aValidMessageStatus.isArchived,
      is_read: aValidMessageStatus.isRead,
      message_id: aValidMessageStatus.messageId,
      op: "UPDATE",
      schema_version: 1,
      status: aValidMessageStatus.status,
      version: 1,
    });
  });
});
