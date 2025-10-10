import { NotificationHubsClient } from "@azure/notification-hubs";
import { program } from "commander";
import csv from "csv-parser";
import fs from "fs";

import { migrateInstallation } from "./notification-hub/index";
import { RegRow } from "./notification-hub/types";
import { parseEnvVariable } from "./utils/index";

interface IImportOptions {
  fromNotificationHub: {
    connectionString: string;
    hubName: string;
  };
  rows: RegRow[];
  toNotificationHub: {
    connectionString: string;
    hubName: string;
  };
}

const run = async ({
  fromNotificationHub,
  rows,
  toNotificationHub,
}: IImportOptions) => {
  const fromClient = new NotificationHubsClient(
    fromNotificationHub.connectionString,
    fromNotificationHub.hubName,
  );
  const toClient = new NotificationHubsClient(
    toNotificationHub.connectionString,
    toNotificationHub.hubName,
  );

  const installationIds = [...new Set(rows.map((r) => r.installationId))];

  for await (const installationId of installationIds) {
    await migrateInstallation(fromClient, toClient, installationId);
    if (installationIds.indexOf(installationId) % 100 === 0) {
      //eslint-disable-next-line no-console
      console.log(
        `${new Date(Date.now()).toLocaleString("it-IT")} - Imported ${installationIds.indexOf(installationId)} installations...`,
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
  .description("Import Notification Hub installations from CSV")
  .option("-p, --path <PATH>", "Full path to the CSV file")
  .action(async (options) => {
    const fromConnectionString = parseEnvVariable("FROM_NH_CONNECTION_STRING");
    const fromHubName = parseEnvVariable("FROM_NH_HUB_NAME");
    const toConnectionString = parseEnvVariable("TO_NH_CONNECTION_STRING");
    const toHubName = parseEnvVariable("TO_NH_HUB_NAME");

    const { path } = options;
    const rows: RegRow[] = await readCsv(path);

    await run({
      fromNotificationHub: {
        connectionString: fromConnectionString,
        hubName: fromHubName,
      },
      rows,
      toNotificationHub: {
        connectionString: toConnectionString,
        hubName: toHubName,
      },
    });

    //eslint-disable-next-line no-console
    console.log(
      `Imported ${rows.length} registrations in ${toHubName} from ${path}`,
    );
  });

program.parse(process.argv);
