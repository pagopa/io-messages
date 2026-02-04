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

const lollipopLambdaClientConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
});

export const configSchema = z.object({
  appInsights: applicationInsightsSchema,
  lollipop: lollipopConfigSchema,
  lollipopLambdaClient: lollipopLambdaClientConfigSchema,
  lollipopLambdaUatClient: lollipopLambdaClientConfigSchema,
  notificationClient: notificationClientConfigSchema,
  notificationUatClient: notificationClientConfigSchema,
});

export const envSchema = z.object({
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
  LOLLIPOP_API_BASE_URL: z.string().url(),
  LOLLIPOP_FUNC_KEY: z.string().min(1),
  LOLLIPOP_LAMBDA_CLIENT_API_KEY: z.string().min(1),
  LOLLIPOP_LAMBDA_CLIENT_BASE_URL: z.string().url(),
  LOLLIPOP_LAMBDA_CLIENT_UAT_API_KEY: z.string().min(1),
  LOLLIPOP_LAMBDA_CLIENT_UAT_BASE_URL: z.string().url(),
  NOTIFICATION_CLIENT_API_KEY: z.string().min(1),
  NOTIFICATION_CLIENT_BASE_URL: z.string().url(),
  NOTIFICATION_CLIENT_UAT_API_KEY: z.string().min(1),
  NOTIFICATION_CLIENT_UAT_BASE_URL: z.string().url(),
});

export type Config = z.TypeOf<typeof configSchema>;

type Env = z.TypeOf<typeof envSchema>;

const mapEnvironmentVariablesToConfig = (env: Env) => ({
  appInsights: {
    connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
  lollipop: {
    apiKey: env.LOLLIPOP_FUNC_KEY,
    baseUrl: env.LOLLIPOP_API_BASE_URL,
  },
  lollipopLambdaClient: {
    apiKey: env.LOLLIPOP_LAMBDA_CLIENT_API_KEY,
    baseUrl: env.LOLLIPOP_LAMBDA_CLIENT_BASE_URL,
  },
  lollipopLambdaUatClient: {
    apiKey: env.LOLLIPOP_LAMBDA_CLIENT_UAT_API_KEY,
    baseUrl: env.LOLLIPOP_LAMBDA_CLIENT_UAT_BASE_URL,
  },
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
