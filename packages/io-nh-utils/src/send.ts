import { NotificationHubsClient } from "@azure/notification-hubs";
import { program } from "commander";
import csv from "csv-parser";
import fs from "fs";

import { sendMessage } from "./notification-hub/index";
import { RegRow } from "./notification-hub/types";
import { parseEnvVariable } from "./utils/index";

interface ISendOptions {
  batchSize: number;
  message: { title: string; content: string };
  notificationHub: {
    connectionString: string;
    hubName: string;
  };
  rows: RegRow[];
}

const run = async ({
  batchSize,
  message,
  notificationHub,
  rows,
}: ISendOptions) => {
  const client = new NotificationHubsClient(
    notificationHub.connectionString,
    notificationHub.hubName,
  );

  const installationIds = [...new Set(rows.map((r) => r.installationId))];
  const errors: string[] = [];

  const batches: string[][] = [];
  for (let i = 0; i < installationIds.length; i += batchSize) {
    batches.push(installationIds.slice(i, i + batchSize));
  }
  for await (const batch of batches) {
    await Promise.all(
      batch.map(async (installationId) => {
        try {
          await sendMessage(client, installationId, message);
        } catch (error) {
          errors.push(installationId);
          //eslint-disable-next-line no-console
          console.error(
            `Error deleting installation ${installationId}: ${error.message}`,
          );
        }
      }),
    );
    //eslint-disable-next-line no-console
    console.log(
      `${new Date(Date.now()).toLocaleString("it-IT")} - Deleted ${(batches.indexOf(batch) + 1) * batchSize} installations...`,
    );
    //eslint-disable-next-line no-console
    console.log(`Last installation deleted: ${batch[batch.length - 1]}`);
  }
};

const readCsv = async (path: string): Promise<RegRow[]> =>
  new Promise((resolve, reject) => {
    const results: RegRow[] = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (data) => results.push(data as RegRow))
      .on("end", () => resolve(results))
      .on("error", reject);
  });

program
  .version("1.0.0")
  .description(
    "Send messages to Notification Hub installations listed in a CSV",
  )
  .option("-p, --path <PATH>", "Full path to the CSV file")
  .option(
    "-b, --batch-size <BATCH_SIZE>",
    "Size of the batches to import",
    "10",
  )
  .option(
    "-t, --title <TITLE>",
    "Title of the message to send",
    "Default Title",
  )
  .option(
    "-c, --content <CONTENT>",
    "Content of the message to send",
    "Default Content",
  )
  .action(async (options) => {
    const connectionString = parseEnvVariable("SEND_NH_CONNECTION_STRING");
    const hubName = parseEnvVariable("SEND_NH_HUB_NAME");

    const { batchSize, path, title, content } = options;
    const rows: RegRow[] = await readCsv(path);

    await run({
      batchSize: Number.parseInt(batchSize),
      message: { title, content },
      notificationHub: {
        connectionString: connectionString,
        hubName: hubName,
      },
      rows,
    });

    //eslint-disable-next-line no-console
    console.log(`Sent ${rows.length} messages in ${hubName} from ${path}`);
  });

program.parse(process.argv);
