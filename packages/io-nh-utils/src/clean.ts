import { NotificationHubsClient } from "@azure/notification-hubs";
import { program } from "commander";
import csv from "csv-parser";
import fs from "fs";

import { deleteInstallation } from "./notification-hub/index";
import { RegRow } from "./notification-hub/types";
import { parseEnvVariable, readTxt, saveCsv } from "./utils/index";
import { createObjectCsvWriter } from "csv-writer";

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
  .option("-s, --source <SOURCE>", "Full path to the source TXT file")
  .option("-p, --path <PATH>", "Full path to the destination CSV file")
  .action(async (options) => {
    const { source, path } = options;

    let oldInstallations: RegRow[];
    const fileExists = fs.existsSync(path);
    if (fileExists) {
      const rows: RegRow[] = await readCsv(path);
      oldInstallations = rows;
    }

    const rows: RegRow[] = await readTxt(source, oldInstallations ?? []);

    const csvWriter = createObjectCsvWriter({
      append: fileExists,
      header: [
        { id: "installationId", title: "installationId" },
        { id: "platform", title: "platform" },
      ],
      path: path,
    });

    await csvWriter.writeRecords(rows);
  });

program.parse(process.argv);
