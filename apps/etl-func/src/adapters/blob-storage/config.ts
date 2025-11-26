import { z } from "zod";

export const messageContentConfigSchema = z.object({
  accountUri: z.url(),
  accountUriItn: z.url(),
  containerName: z.string().min(1),
});

export const messageContentDevConfigSchema = z.object({
  connectionString: z.string().min(1),
  containerName: z.string().min(1),
  itnConnectionString: z.string().min(1),
});

export type MessageContentConfig = z.TypeOf<typeof messageContentConfigSchema>;
