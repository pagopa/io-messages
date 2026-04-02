import { z } from "zod";
import { ErrorInternal } from "./error";

export const SendNotificationMessageSchema = z.object({
  jobId: z.ulid(),
  tags: z.array(z.string()).default([]),
  scheduledTimestamp: z.number().int().positive(),
});

export type SendNotificationMessage = z.infer<
  typeof SendNotificationMessageSchema
>;

export interface SendNotificationMessageQueue {
  sendMessage: (
    sendNotificationMessage: SendNotificationMessage,
  ) => Promise<string | ErrorInternal>;
}
