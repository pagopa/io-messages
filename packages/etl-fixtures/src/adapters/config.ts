import { z } from "zod";

const booleanFromStringSchema = z
  .string()
  .toLowerCase()
  .transform((x) => x === "true")
  .pipe(z.boolean().default(false));

export const configSchema = z.object({
  COMMON_COSMOS__accountEndpoint: z.string().url(),
  COMMON_COSMOS_DBNAME: z.string().min(1),
  COMMON_COSMOS_MESSAGES_CONTAINER_NAME: z.string().min(1),
  FIXTURES_INCLUDE_PAYMENTS: booleanFromStringSchema,
  FIXTURES_INCLUDE_REMOTE_CONTENT: booleanFromStringSchema,
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(1),
  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: z.string().min(1),
  MESSAGE_ERROR_TABLE_STORAGE_NAME: z.string().min(1),
});
export type Config = z.infer<typeof configSchema>;

const inputParametersSchema = z.object({
  fixturesNumber: z.number({ coerce: true }),
});
type InputParameters = z.infer<typeof inputParametersSchema>;

export const validateArguments = (args: string[]): InputParameters => {
  if (args.length < 3) {
    throw new Error(
      "Please provide the number of fixtures to load as an argument",
    );
  }
  return inputParametersSchema.parse({ fixturesNumber: args[2] });
};
