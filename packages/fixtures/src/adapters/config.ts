import { DefaultAzureCredential } from "@azure/identity";
import { z } from "zod";

const booleanFromString = z
  .string()
  .toLowerCase()
  .transform((x) => x === "true")
  .pipe(z.boolean().default(false));

export const loadFixturesOptionsSchema = z.object({
  cosmosDatabaseName: z.string().min(1),
  cosmosEndpoint: z.string().url(),
  cosmosMessageContainerName: z.string().min(1),
  includePayments: booleanFromString,
  includeRemoteContents: booleanFromString,
  storageConnectionString: z.string().min(1),
  storageMessageContentContainerName: z.string().min(1),
});
export type LoadFixturesOptions = {
  aadCredentials: DefaultAzureCredential;
} & z.TypeOf<typeof loadFixturesOptionsSchema>;
