import { describe, expect, test } from "vitest";

import { getMessageStatusEventFromMessage } from "../message-status.js";
import { aValidMessageStatus } from "@/__mocks__/message-status.js";

describe("getMessageStatusEventFromMessage", () => {
  test("Given a valid MessageStatus it should not throw", () => {
    expect(() =>
      getMessageStatusEventFromMessage(aValidMessageStatus),
    ).not.toThrow();
  });

  test("Given a valid MessageStatus, when the version is 0 it should return a valid MessageStatusEvent with op CREATE", () => {
    expect(getMessageStatusEventFromMessage(aValidMessageStatus)).toMatchObject(
      {
        created_at: aValidMessageStatus.updatedAt,
        id: aValidMessageStatus.id,
        is_archived: aValidMessageStatus.isArchived,
        is_read: aValidMessageStatus.isRead,
        message_id: aValidMessageStatus.messageId,
        op: "CREATE",
        schema_version: 1,
        status: aValidMessageStatus.status,
        timestamp: aValidMessageStatus.updatedAt,
        version: aValidMessageStatus.version,
      },
    );
  });

  test("Given a valid MessageStatus, when the version is 1  it should return a valid MessageStatusEvent with op UPDATE", () => {
    expect(
      getMessageStatusEventFromMessage({ ...aValidMessageStatus, version: 1 }),
    ).toMatchObject({
      created_at: aValidMessageStatus.updatedAt,
      id: aValidMessageStatus.id,
      is_archived: aValidMessageStatus.isArchived,
      is_read: aValidMessageStatus.isRead,
      message_id: aValidMessageStatus.messageId,
      op: "UPDATE",
      schema_version: 1,
      status: aValidMessageStatus.status,
      timestamp: aValidMessageStatus.updatedAt,
      version: 1,
    });
  });
});
