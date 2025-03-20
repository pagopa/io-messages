import { z } from "zod";

export const envSchema = z.object({
  COMMON_STORAGE_ACCOUNT_URL: z.string().url(),
  COSMOS_DATABASE_NAME: z.string().min(1),
  COSMOS_URI: z.string().min(1),
  STORAGE_ACCOUNT__serviceUri: z.string().url(),
});
type Env = z.TypeOf<typeof envSchema>;

const mapEnvironmentVariablesToConfig = (env: Env) => ({
  commonCosmos: {
    databaseName: env.COSMOS_DATABASE_NAME,
    uri: env.COSMOS_URI,
  },
  commonStorageAccount: {
    url: env.COMMON_STORAGE_ACCOUNT_URL,
  },
  storageAccount: {
    url: env.STORAGE_ACCOUNT__serviceUri,
  },
});

export const configFromEnvironment = envSchema.transform(
  mapEnvironmentVariablesToConfig,
);
export type Config = z.TypeOf<typeof configFromEnvironment>;
