import { z } from "zod";
import { NotificationHubsClient } from "@azure/notification-hubs";

const config = z
  .object({
    NH_NAME: z.string().min(1),
    NH_ENDPOINT: z.string().min(1),
  })
  .parse(process.env);

export const nhClient = new NotificationHubsClient(
  config.NH_ENDPOINT,
  config.NH_NAME,
);
