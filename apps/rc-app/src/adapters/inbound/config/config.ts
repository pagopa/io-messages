import z from "zod";
// Cosmos is configured with a connection string in local development and with
// Azure credentials (account URI) in production. The NODE_ENV discriminant
// selects which set of variables is required.
const commonCosmosConfigSchema = z.discriminatedUnion("NODE_ENV", [
  z.object({
    NODE_ENV: z.literal("development"),
    REMOTE_CONTENT_COSMOS_CONNECTION_STRING: z.string().min(1),
  }),
  z.object({
    NODE_ENV: z.literal("production"),
    REMOTE_CONTENT_COSMOS_URI: z.url(),
  }),
]);

const baseConfigSchema = z.object({
  HOST: z.ipv4(),
  PORT: z.coerce.number().int().min(1025).max(65_535), // Read as string, parsed as integer.
  RC_CONFIGURATION_CACHE_TTL: z.coerce.number().int().min(1),
  REDIS_PASSWORD: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().min(1).max(65_535),
  REDIS_TLS_ENABLED: z.stringbool().default(true),
  REDIS_URL: z.string().min(1),
  REMOTE_CONTENT_COSMOS_DATABASE_NAME: z.string().min(2),
  npm_package_name: z.string().min(3),
  npm_package_version: z.string().min(5),
});

// The env is flat, so we intersect the base config with the cosmos
// discriminated union instead of nesting it.
export const configSchema = baseConfigSchema.and(commonCosmosConfigSchema);
export type AppConfig = z.TypeOf<typeof configSchema>;
