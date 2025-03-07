import { z } from "zod";

export const eventhubConfigSchema = z.discriminatedUnion("authStrategy", [
  z.object({
    authStrategy: z.literal("Identity"),
    connectionUri: z
      .string()
      .regex(/^[a-zA-Z0-9-]+\.servicebus\.windows\.net$/),
    eventHubName: z.string().min(1),
  }),
  z.object({
    authStrategy: z.literal("ConnectionString"),
    connectionString: z.string().min(1),
  }),
]);

export type EventHubConfig = z.TypeOf<typeof eventhubConfigSchema>;
