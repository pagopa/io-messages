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

const baseConfigSchema = z.object({
  COMMON_COSMOS_DATABASE_NAME: z.string().min(2),
  HOST: z.ipv4(),
  PORT: z.coerce.number().int().min(1025).max(65_535), // Read as string, parsed as integer.
  npm_package_name: z.string().min(3),
  npm_package_version: z.string().min(5),
});

// The env is flat, so we intersect the base config with the cosmos
// discriminated union instead of nesting it.
export const configSchema = baseConfigSchema.and(commonCosmosConfigSchema);
export type AppConfig = z.TypeOf<typeof configSchema>;
