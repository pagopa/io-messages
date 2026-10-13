import { describe, expect, it } from "vitest";

import { eventSchema, syntheticEvent } from "../event.js";

describe("public event contract", () => {
  it("accepts all delivery statuses and read changes", () => {
    for (const status of [
      "ACCEPTED",
      "THROTTLED",
      "FAILED",
      "PROCESSED",
      "REJECTED",
    ] as const) {
      expect(
        eventSchema.safeParse({ ...syntheticEvent("service-A"), status })
          .success,
      ).toBe(true);
    }
    expect(
      eventSchema.safeParse({
        ...syntheticEvent("service-A"),
        eventType: "message.read.changed",
        isRead: true,
      }).success,
    ).toBe(true);
  });
  it("rejects unknown fields, citizen data and malformed service identifiers", () => {
    expect(
      eventSchema.safeParse({
        ...syntheticEvent("service-A"),
        fiscalCode: "SYNTHETIC",
      }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({
        ...syntheticEvent("service-A"),
        subject: "Private content",
      }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({
        ...syntheticEvent("service-A"),
        serviceId: "service-A/#",
      }).success,
    ).toBe(false);
  });
});
