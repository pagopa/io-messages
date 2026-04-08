import { z } from "zod";

import { ErrorInternal } from "./error";

export const SendNotificationMessageSchema = z.object({
  jobId: z.ulid(),
  scheduledTimestamp: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
});

export type SendNotificationMessage = z.infer<
  typeof SendNotificationMessageSchema
>;

export interface SendNotificationMessageQueue {
  sendMessage: (
    sendNotificationMessage: SendNotificationMessage,
  ) => Promise<ErrorInternal | string>;
}
