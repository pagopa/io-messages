import { describe, expect, it } from "vitest";

import {
  eventSchema,
  syntheticCreateSequence,
  syntheticEvent,
} from "../event.js";

describe("public event contract", () => {
  it("correlates a synthetic create to its service and message across three state versions", () => {
    const sequence = syntheticCreateSequence(
      "service-A",
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    );
    expect(sequence.map((event) => event.version)).toEqual([0, 1, 2]);
    expect(sequence.map((event) => event.status)).toEqual([
      "ACCEPTED",
      "PROCESSED",
      "PROCESSED",
    ]);
    expect(sequence.map((event) => event.isRead)).toEqual([false, false, true]);
    expect(sequence.map((event) => event.eventType)).toEqual([
      "message.status.changed",
      "message.status.changed",
      "message.read.changed",
    ]);
    expect(new Set(sequence.map((event) => event.eventId)).size).toBe(3);
    expect(
      sequence.every(
        (event) =>
          event.serviceId === "service-A" &&
          event.messageId === "01ARZ3NDEKTSV4RRFFQ69G5FAV" &&
          eventSchema.safeParse(event).success,
      ),
    ).toBe(true);
  });
  it("keeps distinct creates separate even on one service topic", () => {
    const first = syntheticCreateSequence(
      "service-A",
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    );
    const second = syntheticCreateSequence(
      "service-A",
      "01ARZ3NDEKTSV4RRFFQ69G5FAW",
    );
    expect(first[0].messageId).not.toBe(second[0].messageId);
    expect(first[0].serviceId).toBe(second[0].serviceId);
    expect(() =>
      syntheticCreateSequence("service-A", "invalid-message-id"),
    ).toThrow();
  });
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
