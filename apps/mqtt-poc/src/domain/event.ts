import { randomUUID } from "node:crypto";
import z from "zod";

import { identifierSchema } from "./policy.js";

export const eventSchema = z
  .object({
    eventId: z.uuid(),
    eventType: z.enum(["message.status.changed", "message.read.changed"]),
    isRead: z.boolean(),
    messageId: z.ulid(),
    occurredAt: z.iso.datetime(),
    schemaVersion: z.literal(1),
    serviceId: identifierSchema,
    status: z.enum([
      "ACCEPTED",
      "THROTTLED",
      "FAILED",
      "PROCESSED",
      "REJECTED",
    ]),
    version: z.number().int().nonnegative(),
  })
  .strict();
export type MessageEvent = z.infer<typeof eventSchema>;
export const syntheticEvent = (
  serviceId: string,
  version = 0,
): MessageEvent => ({
  eventId: randomUUID(),
  eventType: "message.status.changed",
  isRead: false,
  messageId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  occurredAt: new Date().toISOString(),
  schemaVersion: 1,
  serviceId,
  status: "PROCESSED",
  version,
});

export const syntheticCreateSequence = (
  serviceId: string,
  messageId: string,
): MessageEvent[] => {
  const initial = eventSchema.parse({
    ...syntheticEvent(serviceId),
    messageId,
    status: "ACCEPTED",
  });
  return [
    initial,
    { ...initial, eventId: randomUUID(), status: "PROCESSED", version: 1 },
    {
      ...initial,
      eventId: randomUUID(),
      eventType: "message.read.changed",
      isRead: true,
      status: "PROCESSED",
      version: 2,
    },
  ];
};
