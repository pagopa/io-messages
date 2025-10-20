import * as z from "zod";
import { applicationInsightsSchema } from "./appinsights/config.js";

const notificationClientConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
});

const lollipopConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
});

export const configSchema = z.object({
  lollipop: lollipopConfigSchema,
  notificationClient: notificationClientConfigSchema,
  notificationUatClient: notificationClientConfigSchema,
  appInsights: applicationInsightsSchema,
});

export const envSchema = z.object({
  LOLLIPOP_API_BASE_URL: z.string().url(),
  LOLLIPOP_FUNC_KEY: z.string().min(1),
  NOTIFICATION_CLIENT_API_KEY: z.string().min(1),
  NOTIFICATION_CLIENT_BASE_URL: z.string().url(),
  NOTIFICATION_CLIENT_UAT_API_KEY: z.string().min(1),
  NOTIFICATION_CLIENT_UAT_BASE_URL: z.string().url(),
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
});

export type Config = z.TypeOf<typeof configSchema>;

type Env = z.TypeOf<typeof envSchema>;

const mapEnvironmentVariablesToConfig = (env: Env) => ({
  lollipop: {
    apiKey: env.LOLLIPOP_FUNC_KEY,
    baseUrl: env.LOLLIPOP_API_BASE_URL,
  },
  notificationClient: {
    apiKey: env.NOTIFICATION_CLIENT_API_KEY,
    baseUrl: env.NOTIFICATION_CLIENT_BASE_URL,
  },
  notificationUatClient: {
    apiKey: env.NOTIFICATION_CLIENT_UAT_API_KEY,
    baseUrl: env.NOTIFICATION_CLIENT_UAT_BASE_URL,
  },
  appInsights: {
    connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
});

export const configFromEnvironment = envSchema
  .transform(mapEnvironmentVariablesToConfig)
  .pipe(configSchema);
