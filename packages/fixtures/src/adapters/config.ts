import { DefaultAzureCredential } from "@azure/identity";
import { z } from "zod";

export const loadFixturesOptionsSchema = z.object({
  cosmosDatabaseName: z.string().min(1),
  cosmosEndpoint: z.string().url(),
  cosmosMessageContainerName: z.string().min(1),
  includePayments: z.boolean().default(false),
  includeRemoteContents: z.boolean().default(false),
  storageConnectionString: z.string().min(1),
  storageMessageContentContainerName: z.string().min(1),
});
export type LoadFixturesOptions = {
  aadCredentials: DefaultAzureCredential;
} & z.TypeOf<typeof loadFixturesOptionsSchema>;
