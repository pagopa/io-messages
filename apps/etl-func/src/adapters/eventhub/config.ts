import { z } from "zod";

export const eventhubConfigSchema = z.object({
  connectionUri: z.string(),
  eventHubName: z.string().min(1),
});

export type EventhubConfigSchema = z.TypeOf<typeof eventhubConfigSchema>;
