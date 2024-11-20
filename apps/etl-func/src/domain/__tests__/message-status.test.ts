import { describe, expect, test } from "vitest";

import { messageStatusSchema } from "../message-status.js";

describe("createMessageStatusEntity", () => {
  test("Given an input, when it is a valid not rejected status, then it should return a valid Status", () => {
    expect(
      messageStatusSchema.parse({
        fiscalCode: "AAABBB00A00A000A",
        messageId: "aValidMessageId",
        status: "PROCESSED",
        updatedAt: 12345,
      }),
    ).toMatchObject({
      fiscalCode: "AAABBB00A00A000A",
      isArchived: false,
      isRead: false,
      messageId: "aValidMessageId",
      status: "PROCESSED",
      updatedAt: 12345,
    });
  });

  test("Given an input, when it is a valid rejected status, then it should return a valid Status", () => {
    expect(
      messageStatusSchema.parse({
        fiscalCode: "AAABBB00A00A000A",
        messageId: "aValidMessageId",
        status: "REJECTED",
        updatedAt: 12345,
      }),
    ).toMatchObject({
      fiscalCode: "AAABBB00A00A000A",
      isArchived: false,
      isRead: false,
      messageId: "aValidMessageId",
      rejection_reason: "UNKNOWN",
      status: "REJECTED",
      updatedAt: 12345,
    });
  });
});
