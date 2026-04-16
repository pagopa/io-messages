import { z } from "zod";

import { ErrorInternal } from "./error";

export const SendNotificationMessageSchema = z.object({
  body: z.string().min(1).max(1000),
  jobId: z.ulid(),
  scheduledTimestamp: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
  title: z.string().min(1).max(500),
});

export type SendNotificationMessage = z.infer<
  typeof SendNotificationMessageSchema
>;

export interface SendNotificationMessageRepository {
  sendMessage: (
    sendNotificationMessage: SendNotificationMessage,
  ) => Promise<ErrorInternal | string>;
}
