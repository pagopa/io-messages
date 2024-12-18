import { aValidMessageStatus } from "@/__mocks__/message-status.js";
import { describe, expect, test } from "vitest";

import { getMessageStatusEvent } from "../message-status-event.js";

describe("getMessageStatusEvent", () => {
  test("Given a valid MessageStatus it should return a valid MessageStatusEvent", () => {
    expect(getMessageStatusEvent(aValidMessageStatus)).toMatchObject({
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
    });
  });
});
