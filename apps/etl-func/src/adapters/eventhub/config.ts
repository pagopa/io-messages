import { z } from "zod";

export const eventhubConfigSchema = z.object({
  connectionUri: z.string().regex(/^[a-zA-Z0-9-]+\.servicebus\.windows\.net$/),
  eventHubName: z.string().min(1),
});

export type EventhubConfigSchema = z.TypeOf<typeof eventhubConfigSchema>;
