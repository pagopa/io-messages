import { NotificationHubsClient } from "@azure/notification-hubs";
import { program } from "commander";
import csv from "csv-parser";
import fs from "fs";

import { deleteInstallation } from "./notification-hub/index";
import { RegRow } from "./notification-hub/types";
import { parseEnvVariable } from "./utils/index";

interface IDeleteOptions {
  notificationHub: {
    connectionString: string;
    hubName: string;
  };
  rows: RegRow[];
}

const run = async ({ notificationHub, rows }: IDeleteOptions) => {
  const client = new NotificationHubsClient(
    notificationHub.connectionString,
    notificationHub.hubName,
  );

  const installationIds = [...new Set(rows.map((r) => r.installationId))];

  for await (const installationId of installationIds) {
    await deleteInstallation(client, installationId);
    if (installationIds.indexOf(installationId) % 100 === 0) {
      //eslint-disable-next-line no-console
      console.log(
        `${new Date(Date.now()).toLocaleString("it-IT")} - Deleted ${installationIds.indexOf(installationId)} installations...`,
      );
    }
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
  .action(async (options) => {
    const fromConnectionString = parseEnvVariable("FROM_NH_CONNECTION_STRING");
    const fromHubName = parseEnvVariable("FROM_NH_HUB_NAME");

    const { path } = options;
    const rows: RegRow[] = await readCsv(path);

    await run({
      notificationHub: {
        connectionString: fromConnectionString,
        hubName: fromHubName,
      },
      rows,
    });

    //eslint-disable-next-line no-console
    console.log(
      `Deleted ${rows.length} registrations in ${fromHubName} from ${path}`,
    );
  });

program.parse(process.argv);
