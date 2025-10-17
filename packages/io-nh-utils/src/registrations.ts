import { program } from "commander";

import { parseEnvVariable } from "./utils/index";
import { NotificationHubsClient } from "@azure/notification-hubs";

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
  .description("Export Notification Hub installations to CSV")
  .action(async () => {
    const connectionString = parseEnvVariable("FROM_NH_CONNECTION_STRING");
    const hubName = parseEnvVariable("FROM_NH_HUB_NAME");
    const blobUrl = parseEnvVariable("BLOB_URL");

    const client = new NotificationHubsClient(connectionString, hubName);

    const start = Date.now();
    const job = await client.submitNotificationHubJob({
      type: "ExportRegistrations",
      outputContainerUrl: blobUrl,
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
