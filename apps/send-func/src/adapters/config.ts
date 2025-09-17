import { z } from "zod";

const notificationClientConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
});

export const configSchema = z.object({
  notificationClient: notificationClientConfigSchema,
});

export const envSchema = z.object({
  NOTIFICATION_CLIENT_API_KEY: z.string().min(1),
  NOTIFICATION_CLIENT_BASE_URL: z.string().url(),
  NOTIFICATION_CLIENT_UAT_API_KEY: z.string().min(1),
  NOTIFICATION_CLIENT_UAT_BASE_URL: z.string().url(),
});

export type Config = z.TypeOf<typeof configSchema>;

type Env = z.TypeOf<typeof envSchema>;

const mapEnvironmentVariablesToConfig = (env: Env) => ({
  notificationClient: {
    apiKey: env.NOTIFICATION_CLIENT_API_KEY,
    baseUrl: env.NOTIFICATION_CLIENT_BASE_URL,
  },
  notificationUatClient: {
    apiKey: env.NOTIFICATION_CLIENT_UAT_API_KEY,
    baseUrl: env.NOTIFICATION_CLIENT_UAT_BASE_URL,
  },
});

export const configFromEnvironment = envSchema
  .transform(mapEnvironmentVariablesToConfig)
  .pipe(configSchema);
