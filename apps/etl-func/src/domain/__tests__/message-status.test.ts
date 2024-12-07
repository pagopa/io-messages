import { describe, expect, test } from "vitest";

import { messageStatusSchema } from "../message-status.js";

describe("createMessageStatusEntity", () => {
  test("Given an input, when it is a valid not rejected status, then it should return a valid Status", () => {
    expect(
      messageStatusSchema.parse({
        fiscalCode: "AAABBB00A00A000A",
        messageId: "01JD4YVX03H45HPGAB3E0Y2658",
        status: "PROCESSED",
        updatedAt: 12345,
      }),
    ).toMatchObject({
      fiscalCode: "AAABBB00A00A000A",
      isArchived: false,
      isRead: false,
      messageId: "01JD4YVX03H45HPGAB3E0Y2658",
      status: "PROCESSED",
      updatedAt: 12345,
    });
  });

  test("Given an input, when it is a valid rejected status, then it should return a valid Status", () => {
    expect(
      messageStatusSchema.parse({
        fiscalCode: "AAABBB00A00A000A",
        messageId: "01JD4YVX03H45HPGAB3E0Y2658",
        status: "REJECTED",
        updatedAt: 12345,
      }),
    ).toMatchObject({
      fiscalCode: "AAABBB00A00A000A",
      isArchived: false,
      isRead: false,
      messageId: "01JD4YVX03H45HPGAB3E0Y2658",
      rejection_reason: "UNKNOWN",
      status: "REJECTED",
      updatedAt: 12345,
    });
  });
});
