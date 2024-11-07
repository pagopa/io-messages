import { z } from "zod";

const eventhubConnectionUriPattern =
  /^https:\/\/[a-zA-Z0-9-]+\.servicebus\.windows\.net$/;

export const eventhubConfigSchema = z.object({
  connectionUri: z
    .string()
    .url()
    .refine((uri) => eventhubConnectionUriPattern.test(uri), {
      message:
        "Invalid eventhub connectionUri. It must be in the 'https://<NamespaceName>.servicebus.windows.net' format",
    }),
  eventHubName: z.string().min(1),
});

export type EventhubConfigSchema = z.TypeOf<typeof eventhubConfigSchema>;
