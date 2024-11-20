import {
  fiscalCodeSchema,
  messageStatusSchema,
} from "@/domain/message-status.js";
import { describe, expect, test } from "vitest";

import { getMessageStatusEventFromMessage } from "../message-status.js";

const aFiscalCode = fiscalCodeSchema.parse("AAADPZ44E08F367A");

const aValidMessageStatus = messageStatusSchema.parse({
  fiscalCode: aFiscalCode,
  id: "01JD4YVX03H45HPGAB3E0Y2658-0000000000000000",
  isArchived: false,
  isRead: false,
  messageId: "01JD4YVX03H45HPGAB3E0Y2658",
  status: "ACCEPTED",
  updatedAt: 123,
  version: 0,
});

describe("getMessageStatusEventFromMessage", () => {
  test("Given a valid MessageStatus it should not throw", () => {
    expect(() =>
      getMessageStatusEventFromMessage(aValidMessageStatus),
    ).not.toThrow();
  });

  test("Given a valid MessageStatus, then the version is 1 it should return a valid MessageStatusEvent with op CREATE", () => {
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

  test("Given a valid MessageStatus, then the version is 1  it should return a valid MessageStatusEvent with op UPDATE", () => {
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
