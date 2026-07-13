import z from "zod";

// Cosmos is configured with a connection string in local development and with
// Azure credentials (account URI) in production. The NODE_ENV discriminant
// selects which set of variables is required.
const commonCosmosConfigSchema = z.discriminatedUnion("NODE_ENV", [
  z.object({
    COMMON_COSMOS_CONNECTION_STRING: z.string().min(1),
    NODE_ENV: z.literal("development"),
  }),
  z.object({
    COMMON_COSMOS_URI: z.url(),
    NODE_ENV: z.literal("production"),
  }),
]);

// Storage Account is configured with a connection string in local development and with
// Azure credentials (account URI) in production. The NODE_ENV discriminant
// selects which set of variables is required.
const commonStorageAccountConfigSchema = z.discriminatedUnion("NODE_ENV", [
  z.object({
    COMMON_STORAGE_ACCOUNT_CONNECTION_STRING: z.string().min(1),
    NODE_ENV: z.literal("development"),
  }),
  z.object({
    COMMON_STORAGE_ACCOUNT_URI: z.url(),
    NODE_ENV: z.literal("production"),
  }),
]);

const baseConfigSchema = z.object({
  COMMON_COSMOS_DATABASE_NAME: z.string().min(2),
  HOST: z.ipv4(),
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(3),
  MESSAGE_METADATA_CONTAINER_NAME: z.string().min(3),
  MESSAGE_STATUS_CONTAINER_NAME: z.string().min(3),
  PN_SERVICE_ID: z.string().min(1),
  PORT: z.coerce.number().int().min(1025).max(65_535), // Read as string, parsed as integer.
  npm_package_name: z.string().min(3),
  npm_package_version: z.string().min(5),
});

// The env is flat, so we intersect the base config with the cosmos
// discriminated union instead of nesting it.
export const configSchema = baseConfigSchema
  .and(commonCosmosConfigSchema)
  .and(commonStorageAccountConfigSchema);
export type AppConfig = z.TypeOf<typeof configSchema>;
