import { describe, test, expect } from "vitest";
import { createMessageStatusEntity } from "../message-status.js";

describe("createMessageStatusEntity", () => {
  test("Given an input, when it is a valid not rejected status, then it should return a valid Status", () => {
    expect(
      createMessageStatusEntity({
        messageId: "aValidMessageId",
        updatedAt: 12345,
        status: "PROCESSED",
      }),
    ).toMatchObject({
      messageId: "aValidMessageId",
      updatedAt: 12345,
      isRead: false,
      isArchived: false,
      status: "PROCESSED",
    });
  });

  test("Given an input, when it is a valid rejected status, then it should return a valid Status", () => {
    expect(
      createMessageStatusEntity({
        messageId: "aValidMessageId",
        updatedAt: 12345,
        status: "REJECTED",
      }),
    ).toMatchObject({
      messageId: "aValidMessageId",
      updatedAt: 12345,
      isRead: false,
      isArchived: false,
      status: "REJECTED",
      rejection_reason: "UNKNOWN",
    });
  });
});
