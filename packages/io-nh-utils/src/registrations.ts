import { program } from "commander";

import { parseEnvVariable } from "./utils/index";
import { NotificationHubsClient } from "@azure/notification-hubs";
import {
  BlobServiceClient,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const makeContainerSasUrl = async (
  accountName: string,
  accountKey: string,
  blobEndpoint: string,
  containerName: string,
): Promise<string> => {
  const cred = new StorageSharedKeyCredential(accountName, accountKey);
  const svc = new BlobServiceClient(`${blobEndpoint}`, cred);
  const container = svc.getContainerClient(containerName);
  await container.createIfNotExists();

  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: containerName,
      permissions: ContainerSASPermissions.parse("rlwc"), // read,list,write,create
      startsOn,
      expiresOn,
      protocol: SASProtocol.HttpsAndHttp,
      version: "2020-10-02",
    },
    cred,
  ).toString();

  return `${container.url}?${sas}`;
};

const waitJobCompleted = async (
  client: NotificationHubsClient,
  jobId: string,
  intervalMs = 15000,
): Promise<void> => {
  for (;;) {
    const j = await client.getNotificationHubJob(jobId);
    if (j.status === "Completed") return;
    if (j.status === "Failed") throw new Error(`Job fallito: ${j.failure}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
};

program
  .version("1.0.0")
  .description("Export Notification Hub registrations to Blob")
  .action(async () => {
    const connectionString = parseEnvVariable("FROM_NH_CONNECTION_STRING");
    const hubName = parseEnvVariable("FROM_NH_HUB_NAME");
    const blobUrl = parseEnvVariable("BLOB_URL");
    const accountName = parseEnvVariable("ACCOUNT_NAME");
    const accountKey = parseEnvVariable("ACCOUNT_KEY");
    const containerName = parseEnvVariable("CONTAINER_NAME");

    const exportContainerSasUrl = await makeContainerSasUrl(
      accountName,
      accountKey,
      blobUrl,
      containerName,
    );
    const client = new NotificationHubsClient(connectionString, hubName);

    const start = Date.now();
    const job = await client.submitNotificationHubJob({
      type: "ExportRegistrations",
      outputContainerUrl: exportContainerSasUrl,
    });

    await waitJobCompleted(client, job.jobId);

    const end = Date.now();
    const diffMs = end - start;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    //eslint-disable-next-line no-console
    console.log(`Fetched in ${minutes}m ${seconds}s`);

    //eslint-disable-next-line no-console
    console.log(`Exported registrations in ${blobUrl}`);
  });

program.parse(process.argv);
