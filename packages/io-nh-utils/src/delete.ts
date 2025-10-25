import { NotificationHubsClient } from "@azure/notification-hubs";
import { program } from "commander";
import csv from "csv-parser";
import fs from "fs";

import { deleteInstallation } from "./notification-hub/index";
import { RegRow } from "./notification-hub/types";
import { parseEnvVariable } from "./utils/index";

interface IDeleteOptions {
  batchSize: number;
  notificationHub: {
    connectionString: string;
    hubName: string;
  };
  rows: RegRow[];
}

const run = async ({ batchSize, notificationHub, rows }: IDeleteOptions) => {
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
          await deleteInstallation(client, installationId);
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
  .description("Delete Notification Hub installations from CSV")
  .option("-p, --path <PATH>", "Full path to the CSV file")
  .option(
    "-b, --batch-size <BATCH_SIZE>",
    "Size of the batches to import",
    "10",
  )
  .action(async (options) => {
    const connectionString = parseEnvVariable("DELETE_NH_CONNECTION_STRING");
    const hubName = parseEnvVariable("DELETE_NH_HUB_NAME");

    const { batchSize, path } = options;
    const rows: RegRow[] = await readCsv(path);

    await run({
      batchSize: Number.parseInt(batchSize),
      notificationHub: {
        connectionString: connectionString,
        hubName: hubName,
      },
      rows,
    });

    //eslint-disable-next-line no-console
    console.log(
      `Deleted ${rows.length} registrations in ${hubName} from ${path}`,
    );
  });

program.parse(process.argv);
