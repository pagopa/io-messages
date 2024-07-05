import { z } from "zod";

export const notificationHubsConfigSchema = z.object({
  hubs: z.map(
    z.string(),
    z.object({
      connectionString: z.string().min(1),
    }),
  ),
});

export type NotificationHubsConfig = z.TypeOf<
  typeof notificationHubsConfigSchema
>;
