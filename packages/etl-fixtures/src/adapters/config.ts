import { z } from "zod";

const booleanFromStringSchema = z
  .string()
  .toLowerCase()
  .transform((x) => x === "true")
  .pipe(z.boolean().default(false));

export const configSchema = z.object({
  COSMOS_URI: z.string().url(),
  COSMOS_DATABASE_NAME: z.string().min(1),
  COSMOS_MESSAGE_CONTAINER_NAME: z.string().min(1),
  COMMON_STORAGE_ACCOUNT_CONN_STRING: z.string().min(1),
  COMMON_STORAGE_ACCOUNT_MESSAGE_CONTAINER_NAME: z.string().min(1),
  INCLUDE_REMOTE_CONTENT: booleanFromStringSchema,
  INCLUDE_PAYMENTS: booleanFromStringSchema,
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
